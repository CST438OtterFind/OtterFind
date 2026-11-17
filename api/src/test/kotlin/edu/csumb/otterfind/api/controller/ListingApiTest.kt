package edu.csumb.otterfind.api.controller

import io.restassured.RestAssured.given
import io.restassured.response.Response
import io.restassured.specification.RequestSpecification
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import org.testcontainers.postgresql.PostgreSQLContainer
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** Runs the listing routes against real Postgres, with tokens signed the way real sign-in will sign them. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
class ListingApiTest {
    companion object {
        @Container
        @JvmStatic
        val postgres = PostgreSQLContainer("postgres:17-alpine")

        @DynamicPropertySource
        @JvmStatic
        fun useContainerDatabase(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url", postgres::getJdbcUrl)
            registry.add("spring.datasource.username", postgres::getUsername)
            registry.add("spring.datasource.password", postgres::getPassword)
        }
    }

    @LocalServerPort
    private var port = 0

    @Value("\${app.jwt.secret-base64}")
    private lateinit var secretBase64: String

    @Value("\${app.jwt.issuer}")
    private lateinit var issuer: String

    @Autowired
    private lateinit var jdbc: JdbcTemplate

    private var alice = 0L
    private var bob = 0L
    private var libraryId = 0L

    private fun addUser(email: String): Long =
        jdbc.queryForObject(
            "INSERT INTO users (email, display_name, oauth_provider, oauth_provider_user_id) VALUES (?, ?, 'GITHUB', ?) RETURNING id",
            Long::class.java,
            email,
            email.substringBefore('@'),
            email,
        )!!

    @BeforeEach
    fun resetData() {
        jdbc.update("DELETE FROM users")
        alice = addUser("alice@example.test")
        bob = addUser("bob@example.test")
        libraryId = jdbc.queryForObject("SELECT id FROM buildings WHERE name = 'Library'", Long::class.java)!!
    }

    private fun signedInAs(user: Long): RequestSpecification = signedInWith(user.toString())

    private fun signedInWith(subject: String): RequestSpecification =
        given().port(port).header("Authorization", "Bearer ${signedToken(subject, secretBase64, issuer)}")

    private fun validBody(title: String = "Grey tabby cat", latitude: Double? = 36.65231, longitude: Double? = -121.79614): Map<String, Any?> = mapOf(
        "title" to title,
        "listingType" to "LOST",
        "category" to "PET",
        "buildingId" to libraryId,
        "floor" to 2,
        "latitude" to latitude,
        "longitude" to longitude,
    )

    private fun post(user: Long, body: Map<String, Any?>): Response = signedInAs(user).contentType("application/json").body(body).post("/api/items")

    private fun postedId(user: Long, body: Map<String, Any?> = validBody()): Long =
        post(user, body).then().statusCode(201).extract().jsonPath().getLong("id")

    private fun listingCount(): Int = jdbc.queryForObject("SELECT COUNT(*) FROM item_listings", Int::class.java)!!

    private fun invalidFields(response: Response): List<String> {
        assertEquals(400, response.statusCode())
        assertTrue(response.contentType().startsWith("application/problem+json"), "Content type was ${response.contentType()}")
        return response.jsonPath().getList("errors.field")
    }

    @Test
    fun `every listing route needs a token`() {
        assertEquals(401, given().port(port).get("/api/items").statusCode())
        assertEquals(401, given().port(port).contentType("application/json").body(validBody()).post("/api/items").statusCode())
        assertEquals(401, given().port(port).get("/api/items/1").statusCode())
        assertEquals(401, given().port(port).delete("/api/items/1").statusCode())
    }

    @Test
    fun `posting saves the listing with its building and pin`() {
        val response = post(alice, validBody())

        assertEquals(201, response.statusCode())
        val id = response.jsonPath().getLong("id")
        assertEquals("/api/items/$id", response.header("Location"))
        assertEquals("Grey tabby cat", response.jsonPath().getString("title"))
        assertEquals("Library", response.jsonPath().getString("building.name"))
        assertEquals(36.65231, response.jsonPath().getDouble("latitude"), 0.00001)
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM item_listings WHERE id = ? AND owner_id = ?", Int::class.java, id, alice))
    }

    @Test
    fun `the owner comes from the token, even if the request names someone else`() {
        val id = post(alice, validBody() + mapOf("ownerId" to bob)).then().statusCode(201).extract().jsonPath().getLong("id")
        assertEquals(alice, jdbc.queryForObject("SELECT owner_id FROM item_listings WHERE id = ?", Long::class.java, id))
    }

    @Test
    fun `the list is newest first and marks which listings are yours`() {
        val first = postedId(alice, validBody("First listing"))
        val second = postedId(bob, validBody("Second listing"))

        val body = signedInAs(alice).get("/api/items").then().statusCode(200).extract().jsonPath()

        assertEquals(listOf(second.toInt(), first.toInt()), body.getList<Int>("id"))
        assertEquals(listOf(false, true), body.getList<Boolean>("mine"))
    }

    @Test
    fun `a resolved listing leaves the list but can still be opened`() {
        val id = postedId(alice)
        jdbc.update("UPDATE item_listings SET status = 'RESOLVED' WHERE id = ?", id)

        assertEquals(0, signedInAs(alice).get("/api/items").jsonPath().getList<Any>("$").size)
        assertEquals("RESOLVED", signedInAs(alice).get("/api/items/$id").jsonPath().getString("status"))
    }

    @Test
    fun `a listing with no pin is allowed`() {
        val response = post(alice, validBody(latitude = null, longitude = null))
        assertEquals(201, response.statusCode())
        assertEquals(null, response.jsonPath().get<Double?>("latitude"))
    }

    @Test
    fun `a short title and a missing building are both reported, and nothing is saved`() {
        val response = post(alice, validBody("Cat") - "buildingId")

        assertEquals(setOf("title", "buildingId"), invalidFields(response).toSet())
        assertEquals("Title must be at least 4 characters", response.jsonPath().getString("errors.find { it.field == 'title' }.message"))
        assertEquals(0, listingCount())
    }

    @Test
    fun `a pin off campus is refused, so a direct API call can't save one`() {
        val response = post(alice, validBody(latitude = 36.6, longitude = -121.9))

        assertEquals(listOf("latitude"), invalidFields(response))
        assertEquals("Pins must be on the CSUMB campus", response.jsonPath().getString("errors[0].message"))
        assertEquals(0, listingCount())
    }

    @Test
    fun `half a pin is refused`() {
        assertEquals(listOf("latitude"), invalidFields(post(alice, validBody(longitude = null))))
    }

    @Test
    fun `an unknown building is refused`() {
        assertEquals(listOf("buildingId"), invalidFields(post(alice, validBody() + mapOf("buildingId" to 999_999))))
    }

    @Test
    fun `unreadable JSON is a 400 and not a 500`() {
        assertEquals(400, signedInAs(alice).contentType("application/json").body("{").post("/api/items").statusCode())
    }

    @Test
    fun `an unknown listing is a 404`() {
        assertEquals(404, signedInAs(alice).get("/api/items/999999").statusCode())
        assertEquals(404, signedInAs(alice).delete("/api/items/999999").statusCode())
    }

    @Test
    fun `any signed-in user can open a listing, but only its owner is told it's theirs`() {
        val id = postedId(alice)
        assertEquals(true, signedInAs(alice).get("/api/items/$id").jsonPath().getBoolean("mine"))
        assertEquals(false, signedInAs(bob).get("/api/items/$id").jsonPath().getBoolean("mine"))
    }

    @Test
    fun `you can delete your own listing`() {
        val id = postedId(alice)

        assertEquals(204, signedInAs(alice).delete("/api/items/$id").statusCode())
        assertEquals(404, signedInAs(alice).get("/api/items/$id").statusCode())
    }

    @Test
    fun `ownership - you can't delete someone else's listing`() {
        val id = postedId(alice)

        val response = signedInAs(bob).delete("/api/items/$id")

        assertEquals(403, response.statusCode())
        assertTrue(response.contentType().startsWith("application/problem+json"), "Content type was ${response.contentType()}")
        assertEquals(1, listingCount())
    }

    @Test
    fun `a token that doesn't name a user is rejected`() {
        assertEquals(401, signedInWith("user-1").get("/api/items").statusCode())
    }

    @Test
    fun `a token for a deleted account can't post`() {
        jdbc.update("DELETE FROM users WHERE id = ?", bob)
        assertEquals(401, post(bob, validBody()).statusCode())
        assertEquals(0, listingCount())
    }

    @Test
    fun `deleting an account removes its listings`() {
        postedId(alice)
        jdbc.update("DELETE FROM users WHERE id = ?", alice)
        assertEquals(0, listingCount())
    }

    @Test
    fun `a building with listings can't be deleted`() {
        postedId(alice)
        val blocked = runCatching { jdbc.update("DELETE FROM buildings WHERE id = ?", libraryId) }
        assertTrue(blocked.isFailure)
    }
}

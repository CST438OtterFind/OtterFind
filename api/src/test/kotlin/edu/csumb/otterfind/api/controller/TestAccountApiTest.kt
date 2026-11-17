package edu.csumb.otterfind.api.controller

import edu.csumb.otterfind.api.service.isOnCampus
import io.restassured.RestAssured.given
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import org.testcontainers.postgresql.PostgreSQLContainer
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** Checks the e2e profile's test account and test data on real Postgres. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test", "e2e")
@Testcontainers
class TestAccountApiTest {
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

    private fun tokenFor(email: String) = given().port(port).post("/test/token?email=$email")

    @Test
    fun `a test account's token works on the real listing routes`() {
        val token = tokenFor("e2e-user@example.test").then().statusCode(200).extract().jsonPath().getString("token")

        val listings = given().port(port).header("Authorization", "Bearer $token").get("/api/items").then().statusCode(200).extract().jsonPath()

        assertEquals(6, listings.getList<Any>("$").size)
        assertEquals("Grey tabby cat", listings.getString("[0].title"))
        assertEquals(true, listings.getBoolean("[0].mine"))
    }

    @Test
    fun `only the seeded test accounts get a token`() {
        assertEquals(404, tokenFor("someone@csumb.edu").statusCode())
    }

    @Test
    fun `every seeded pin is on campus, and one listing has no pin for PRD-5`() {
        val token = tokenFor("e2e-other@example.test").jsonPath().getString("token")
        val listings = given().port(port).header("Authorization", "Bearer $token").get("/api/items")
            .jsonPath().getList<Map<String, Any?>>("$")

        val pinned = listings.filter { it["latitude"] != null }
        assertEquals(5, pinned.size)
        assertTrue(pinned.all { isOnCampus((it["latitude"] as Number).toDouble(), (it["longitude"] as Number).toDouble()) })
    }
}

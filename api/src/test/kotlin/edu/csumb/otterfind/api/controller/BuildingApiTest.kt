package edu.csumb.otterfind.api.controller

import io.restassured.RestAssured.given
import io.restassured.common.mapper.TypeRef
import io.restassured.response.Response
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import org.testcontainers.postgresql.PostgreSQLContainer
import kotlin.test.assertContains
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** Runs the real API against real Postgres, so the Flyway migration and its seed data are covered too. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
class BuildingApiTest {
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

        // OpenStreetMap's boundary for the main campus. Matches app/src/features/map/campus.ts.
        private const val SOUTH = 36.64632
        private const val WEST = -121.80947
        private const val NORTH = 36.66136
        private const val EAST = -121.78564
    }

    @LocalServerPort
    private var port = 0

    private fun getBuildings(): Response = given().port(port).get("/api/buildings")

    private fun buildings(): List<Map<String, Any>> = getBuildings().then().extract().`as`(object : TypeRef<List<Map<String, Any>>>() {})

    @Test
    fun `buildings need no token`() {
        assertEquals(200, getBuildings().statusCode())
    }

    @Test
    fun `each building has an id, a name and coordinates`() {
        val library = buildings().first { it["name"] == "Library" }
        assertEquals(setOf("id", "name", "latitude", "longitude"), library.keys)
        assertEquals(36.65231, (library["latitude"] as Number).toDouble(), 0.00001)
        assertEquals(-121.79614, (library["longitude"] as Number).toDouble(), 0.00001)
    }

    @Test
    fun `the buildings named in the PRD are seeded`() {
        val names = buildings().map { it["name"] as String }
        assertContains(names, "Library")
        assertContains(names, "Student Center")
    }

    @Test
    fun `buildings are sorted by name`() {
        val names = buildings().map { it["name"] as String }
        assertEquals(names.sortedBy { it.lowercase() }, names)
    }

    @Test
    fun `every seeded building is on campus`() {
        val offCampus = buildings().filterNot {
            val latitude = (it["latitude"] as Number).toDouble()
            val longitude = (it["longitude"] as Number).toDouble()
            latitude in SOUTH..NORTH && longitude in WEST..EAST
        }
        assertTrue(offCampus.isEmpty(), "Off campus: $offCampus")
    }

    @Test
    fun `only reading is public, so posting a building without a token is rejected`() {
        val response = given().port(port).contentType("application/json").body("{}").post("/api/buildings")
        assertEquals(401, response.statusCode())
    }

    @Test
    fun `a browser on a configured origin can read the response`() {
        val response = given().port(port).header("Origin", "http://localhost:8081").get("/api/buildings")
        assertEquals("http://localhost:8081", response.header("Access-Control-Allow-Origin"))
    }
}

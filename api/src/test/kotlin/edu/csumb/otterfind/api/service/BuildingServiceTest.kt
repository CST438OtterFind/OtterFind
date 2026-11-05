package edu.csumb.otterfind.api.service

import edu.csumb.otterfind.api.repository.Building
import edu.csumb.otterfind.api.repository.BuildingRepository
import org.junit.jupiter.api.Test
import java.lang.reflect.Proxy
import kotlin.test.assertEquals

class BuildingServiceTest {
    /** Answers only findAll, which is all the service should need. */
    private fun repositoryWith(vararg buildings: Building): BuildingRepository = Proxy.newProxyInstance(
        BuildingRepository::class.java.classLoader,
        arrayOf(BuildingRepository::class.java),
    ) { _, method, _ ->
        check(method.name == "findAll") { "Unexpected repository call: ${method.name}" }
        buildings.toList()
    } as BuildingRepository

    private fun building(name: String) = Building(id = 1, name = name, latitude = 36.65, longitude = -121.79)

    @Test
    fun `buildings come back sorted by name`() {
        val service = BuildingService(repositoryWith(building("Tide Hall"), building("Asilomar Hall")))
        assertEquals(listOf("Asilomar Hall", "Tide Hall"), service.listBuildings().map { it.name })
    }

    @Test
    fun `sorting ignores case, so a lowercase name doesn't land after Z`() {
        val service = BuildingService(repositoryWith(building("Yarrow Hall"), building("beach hall"), building("Chapman")))
        assertEquals(listOf("beach hall", "Chapman", "Yarrow Hall"), service.listBuildings().map { it.name })
    }

    @Test
    fun `no buildings is an empty list, not an error`() {
        assertEquals(emptyList(), BuildingService(repositoryWith()).listBuildings())
    }
}

package edu.csumb.otterfind.api.controller

import edu.csumb.otterfind.api.repository.Building
import edu.csumb.otterfind.api.service.BuildingService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/** Serves `/api/buildings`, as described in docs/openapi.yaml. */
@RestController
@RequestMapping("/api/buildings")
class BuildingController(private val buildingService: BuildingService) {
    /** Lists every campus building. */
    @GetMapping
    fun listBuildings(): List<Building> = buildingService.listBuildings()
}

package edu.csumb.otterfind.api.service

import edu.csumb.otterfind.api.repository.Building
import edu.csumb.otterfind.api.repository.BuildingRepository
import org.springframework.stereotype.Service

/** Supplies the buildings shown on the map and in the building picker. */
@Service
class BuildingService(private val buildings: BuildingRepository) {
    /** Returns every building sorted by name, ignoring case, so the order doesn't depend on the database's collation. */
    fun listBuildings(): List<Building> = buildings.findAll().sortedBy { it.name.lowercase() }
}

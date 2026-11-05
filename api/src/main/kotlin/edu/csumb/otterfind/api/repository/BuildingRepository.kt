package edu.csumb.otterfind.api.repository

import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Table
import org.springframework.data.repository.ListCrudRepository

/** A campus building. Rows come from the Flyway seed in V2__buildings.sql, so the API only reads them. */
@Table("buildings")
data class Building(
    @Id val id: Long,
    val name: String,
    val latitude: Double,
    val longitude: Double,
)

/** Reads buildings from Postgres. */
interface BuildingRepository : ListCrudRepository<Building, Long>

package edu.csumb.otterfind.api

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
@SpringBootApplication
class OtterFindApplication

/** Starts the API. */
fun main(args: Array<String>) {
    runApplication<OtterFindApplication>(*args)
}
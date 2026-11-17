package edu.csumb.otterfind.api.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.time.Clock

/** Supplies the current time, so tests can fix it. */
@Configuration
class ClockConfig {
    /** The system clock in UTC. */
    @Bean
    fun clock(): Clock = Clock.systemUTC()
}

package edu.csumb.otterfind.api.config

import org.springframework.boot.context.properties.ConfigurationProperties

/** The `app.*` settings in application.yaml. */
@ConfigurationProperties("app")
data class AppProperties(
    val jwt: Jwt,
    val cors: Cors = Cors(),
) {
    /** Verifies the API's own access tokens. */
    data class Jwt(
        val secretBase64: String,
        val issuer: String,
    )

    /** Browser origins allowed to call the API. */
    data class Cors(
        val origins: List<String> = emptyList(),
    )
}

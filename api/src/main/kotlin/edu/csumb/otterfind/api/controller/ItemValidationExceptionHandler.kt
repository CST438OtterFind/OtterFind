
package edu.csumb.otterfind.api.controller

import org.springframework.http.HttpStatus
import org.springframework.http.ProblemDetail
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.context.request.ServletWebRequest
import org.springframework.web.server.ResponseStatusException
import java.net.URI

@RestControllerAdvice
class ItemValidationExceptionHandler {

    @ExceptionHandler(ResponseStatusException::class)
    fun handleResponseStatus(
        exception: ResponseStatusException,
        request: ServletWebRequest
    ): ResponseEntity<ProblemDetail> {
        val status = exception.statusCode
        val problem = ProblemDetail.forStatusAndDetail(
            status,
            exception.reason ?: "Request failed"
        )

        problem.type = URI.create("about:blank")
        problem.instance = URI.create(
            request.request.requestURI
        )

        if (status.value() == 400) {
            problem.setProperty(
                "errors",
                listOf(
                    mapOf(
                        "field" to "request",
                        "message" to (
                            exception.reason ?: "Invalid request"
                        )
                    )
                )
            )
        }

        return ResponseEntity
            .status(status)
            .body(problem)
    }
}

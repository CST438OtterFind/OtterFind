package edu.csumb.otterfind.api.config

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.AuthenticationException
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint
import org.springframework.security.oauth2.server.resource.web.access.BearerTokenAccessDeniedHandler
import org.springframework.security.web.AuthenticationEntryPoint
import org.springframework.security.web.access.AccessDeniedHandler
import tools.jackson.databind.json.JsonMapper

/** Writes a Spring Security rejection as RFC 9457 Problem Details. See docs/error-model.md. */
private fun HttpServletResponse.writeProblem(status: HttpStatus, detail: String, request: HttpServletRequest) {
    contentType = MediaType.APPLICATION_PROBLEM_JSON_VALUE
    val problem = mapOf(
        "type" to "about:blank",
        "title" to status.reasonPhrase,
        "status" to status.value(),
        "detail" to detail,
        "instance" to request.requestURI,
    )
    outputStream.write(JsonMapper.shared().writeValueAsBytes(problem))
}

/** Answers a missing, invalid or expired token with a 401 and a `WWW-Authenticate` header. */
class ProblemAuthenticationEntryPoint : AuthenticationEntryPoint {
    private val bearer = BearerTokenAuthenticationEntryPoint()

    override fun commence(request: HttpServletRequest, response: HttpServletResponse, exception: AuthenticationException) {
        bearer.commence(request, response, exception)
        response.writeProblem(HttpStatus.UNAUTHORIZED, "Sign in to continue.", request)
    }
}

/** Answers a signed-in user who isn't allowed to do something with a 403. */
class ProblemAccessDeniedHandler : AccessDeniedHandler {
    private val bearer = BearerTokenAccessDeniedHandler()

    override fun handle(request: HttpServletRequest, response: HttpServletResponse, exception: AccessDeniedException) {
        bearer.handle(request, response, exception)
        response.writeProblem(HttpStatus.FORBIDDEN, "You don't have permission to do that.", request)
    }
}

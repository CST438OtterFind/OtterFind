package edu.csumb.otterfind.api.controller

import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.JWSHeader
import com.nimbusds.jose.crypto.MACSigner
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jwt.SignedJWT
import java.time.Duration
import java.time.Instant
import java.util.Base64
import java.util.Date

/** Signs a token the way real sign-in will: with the API's key, and the user's ID as the subject. */
fun signedToken(subject: String, secretBase64: String, issuer: String): String {
    val claims = JWTClaimsSet.Builder()
        .subject(subject)
        .issuer(issuer)
        .expirationTime(Date.from(Instant.now().plus(Duration.ofHours(1))))
        .build()
    return SignedJWT(JWSHeader(JWSAlgorithm.HS256), claims)
        .apply { sign(MACSigner(Base64.getDecoder().decode(secretBase64))) }
        .serialize()
}

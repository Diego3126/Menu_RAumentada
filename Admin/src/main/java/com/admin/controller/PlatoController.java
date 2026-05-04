package com.admin.controller;

import com.admin.model.Plato;
import com.admin.model.User;
import com.admin.model.AuthResponse;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

import javax.annotation.PostConstruct;
import javax.crypto.SecretKey;
import javax.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import java.util.Date;
import com.admin.service.PlatoService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@RestController
@RequestMapping("/api/platos")
public class PlatoController {

    private final PlatoService platoService;

    public PlatoController(PlatoService platoService) {
        this.platoService = platoService;
    }

    @Value("${jwt.secret:}")
    private String jwtSecret;

    private SecretKey signingKey;

    @PostConstruct
    public void init() {
        if (jwtSecret == null || jwtSecret.length() < 32) {
            throw new IllegalStateException("jwt.secret must be configured and at least 32 chars long");
        }
        signingKey = Keys.hmacShaKeyFor(jwtSecret.getBytes());
    }

    // 🔹 LOGIN (MRA-30) — ahora emite JWT que incluye el rol
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestParam String usuario, @RequestParam String password) {
        String role = null;
        if (usuario.equals("admin") && password.equals("1234")) {
            role = "ADMIN";
        } else if (usuario.equals("cocinero") && password.equals("1234")) {
            role = "COCINERO";
        }

        if (role == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        long now = System.currentTimeMillis();
        String jws = Jwts.builder()
                .setSubject(usuario)
                .claim("role", role)
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + 1000L * 60 * 60 * 4)) // 4 horas
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();

        AuthResponse resp = new AuthResponse(jws, role);
        return ResponseEntity.ok(resp);
    }

    private Jws<Claims> parseToken(HttpServletRequest req) {
        String auth = req.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) return null;
        String token = auth.substring(7);
        try {
            return Jwts.parserBuilder().setSigningKey(signingKey).build().parseClaimsJws(token);
        } catch (Exception e) {
            return null;
        }
    }

    private boolean requireRole(HttpServletRequest req, String requiredRole) {
        Jws<Claims> jws = parseToken(req);
        if (jws == null) return false;
        String role = jws.getBody().get("role", String.class);
        return requiredRole.equals(role);
    }

    // 🔹 LISTAR PLATOS
    @GetMapping
    public List<Plato> listar() {
        return platoService.listar();
    }

    // 🔹 AGREGAR PLATO (JSON)
    @PostMapping
    public Plato guardar(@RequestBody Plato plato) {
        return platoService.guardar(plato);
    }

    // 🔹 SUBIR MODELO 3D (MRA-33)
    @PostMapping("/upload")
    public Plato subirModelo(
            @RequestParam String nombre,
            @RequestParam double precio,
            @RequestParam("archivo") MultipartFile archivo,
            HttpServletRequest request) throws IOException {

        // Requerir rol ADMIN
        if (!requireRole(request, "ADMIN")) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }

        // Ruta donde se guardan los archivos
        String carpeta = "uploads/";
        Path ruta = Paths.get(carpeta);

        // Crear carpeta si no existe
        if (!Files.exists(ruta)) {
            Files.createDirectories(ruta);
        }

        // Guardar archivo
        String nombreArchivo = archivo.getOriginalFilename();
        Path rutaArchivo = ruta.resolve(nombreArchivo);
        Files.write(rutaArchivo, archivo.getBytes());

        // Guardar plato con modelo
        return platoService.guardarConModelo(nombre, precio, nombreArchivo);
    }

    // 🔹 MODIFICAR PRECIO (MRA-32)
    @PutMapping("/{nombre}/precio")
    public Plato actualizarPrecio(
            @PathVariable String nombre,
            @RequestParam double nuevoPrecio,
            HttpServletRequest request) {

        if (!requireRole(request, "ADMIN")) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }

        return platoService.actualizarPrecio(nombre, nuevoPrecio);
    }
}
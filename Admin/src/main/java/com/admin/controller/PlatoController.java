package com.admin.controller;

import com.admin.model.Plato;
import com.admin.service.PlatoService;

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

    // 🔹 LOGIN (MRA-30)
    @PostMapping("/login")
    public String login(@RequestParam String usuario, @RequestParam String password) {
        if (usuario.equals("admin") && password.equals("1234")) {
            return "Login correcto";
        }
        return "Credenciales incorrectas";
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
            @RequestParam("archivo") MultipartFile archivo) throws IOException {

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
            @RequestParam double nuevoPrecio) {

        return platoService.actualizarPrecio(nombre, nuevoPrecio);
    }
}
package com.admin.service;

import com.admin.model.Plato;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class PlatoService {

    private List<Plato> listaPlatos = new ArrayList<>();

    // 🔹 Obtener todos los platos
    public List<Plato> listar() {
        return listaPlatos;
    }

    // 🔹 Agregar plato (sin archivo)
    public Plato guardar(Plato plato) {
        listaPlatos.add(plato);
        return plato;
    }

    // 🔹 Agregar plato con modelo 3D
    public Plato guardarConModelo(String nombre, double precio, String modelo3D) {
        Plato plato = new Plato();
        plato.setNombre(nombre);
        plato.setPrecio(precio);
        plato.setModelo3D(modelo3D);

        listaPlatos.add(plato);
        return plato;
    }

    // 🔹 Actualizar precio
    public Plato actualizarPrecio(String nombre, double nuevoPrecio) {
        for (Plato p : listaPlatos) {
            if (p.getNombre().equalsIgnoreCase(nombre)) {
                p.setPrecio(nuevoPrecio);
                return p;
            }
        }
        return null;
    }
}
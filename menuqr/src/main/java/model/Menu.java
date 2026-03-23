package com.menu.menuqr.model;

import java.util.List;

public class Menu {

    private String nombreRestaurante;
    private List<String> platos;

    public Menu(String nombreRestaurante, List<String> platos) {
        this.nombreRestaurante = nombreRestaurante;
        this.platos = platos;
    }

    public String getNombreRestaurante() {
        return nombreRestaurante;
    }

    public List<String> getPlatos() {
        return platos;
    }
}
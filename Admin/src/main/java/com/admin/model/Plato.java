package com.admin.model;

public class Plato {

    private String nombre;
    private double precio;
    private String modelo3D;

    public Plato() {}

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public double getPrecio() {
        return precio;
    }

    public void setPrecio(double precio) {
        this.precio = precio;
    }

    public String getModelo3D() {
        return modelo3D;
    }

    public void setModelo3D(String modelo3D) {
        this.modelo3D = modelo3D;
    }
}
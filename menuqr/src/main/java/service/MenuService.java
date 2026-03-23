package com.menu.menuqr.service;

import com.menu.menuqr.model.Menu;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MenuService {

    public Menu obtenerMenu(String id) {

        if (id.equals("1")) {
            return new Menu("Restaurante Italiano",
                    List.of("Pizza", "Pasta", "Lasaña"));
        } else if (id.equals("2")) {
            return new Menu("Restaurante Mexicano",
                    List.of("Tacos", "Burritos", "Quesadillas"));
        }

        return new Menu("Menú no encontrado",
                List.of("No disponible"));
    }
}
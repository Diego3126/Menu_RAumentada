package com.menu.menuqr.controller;

import com.menu.menuqr.model.Menu;
import com.menu.menuqr.service.MenuService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
public class MenuController {

    private final MenuService menuService;

    public MenuController(MenuService menuService) {
        this.menuService = menuService;
    }

    @GetMapping("/menu/{id}")
    public String verMenu(@PathVariable String id, Model model) {

        Menu menu = menuService.obtenerMenu(id);

        model.addAttribute("nombreRestaurante", menu.getNombreRestaurante());
        model.addAttribute("platos", menu.getPlatos());

        return "menu";
    }
}
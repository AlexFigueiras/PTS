# Guia Visual: aplicação dos componentes

Como a paleta e os tokens de [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) (fonte canônica) se materializam nos componentes da **Plataforma de Governança Intersetorial de PTS**.

> Para cores, tipografia e geometria, leia [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md). Este guia documenta **uso**.

## 🏠 Visão Geral do Layout

Dashboard SaaS Premium em três zonas:

1. **Sidebar Lateral** — azul profundo (`--primary`), navegação principal e branding.
2. **Main Canvas** — fundo off-white (`--background`), palco para os cartões.
3. **Cartões de Conteúdo** — brancos (`--card`), bordas muito arredondadas e sombras sutis.

## 🧩 Componentes Chave

### Sidebar (Navegação)
- **Background:** `--primary`.
- **Items:** ícones em contorno com texto `uppercase font-black`.
- **Active State:** fundo branco com texto azul — contraste invertido.

### Formulários (PTS / Pacientes / Unidades)
- **Container:** cartão branco com `shadow-diffusion`.
- **Inputs:** bordas arredondadas (`rounded-2xl`), fundo `bg-secondary/30` para contraste com o card.
- **Botões:** grandes, com `shadow-diffusion` na cor do botão e efeito de escala no clique (`active:scale-95`).

### Cartões de Dashboard
- **Padding generoso** (`p-8` a `p-12`) para respiro visual.
- **Header do card**: label em `text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60`.

## 📐 Aplicação dos tokens Tailwind

| Aplicação | Token Tailwind | Origem |
|---|---|---|
| Radii geral (inputs, botões) | `rounded-2xl` | DESIGN_SYSTEM §Geometria |
| Radii containers (cartões grandes) | `rounded-3xl` | DESIGN_SYSTEM §Geometria |
| Sombra padrão de cartão | `shadow-diffusion` | custom token (`0 20px 40px -12px rgba(0,0,0,0.06)`) |
| Header de seção | `text-4xl font-black uppercase italic tracking-tighter` | DESIGN_SYSTEM §Tipografia |
| Label pequena | `text-[10px] font-black uppercase tracking-[0.2em]` | DESIGN_SYSTEM §Tipografia |
| Transição de botão | `transition-all duration-300 active:scale-95` | DESIGN_SYSTEM §Regras |

---
*Última atualização: 2026-05-26.*

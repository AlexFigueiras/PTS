# Design System: MyDoc / Midnight Slate Evolution

Este documento formaliza a identidade visual do ecossistema CAPS, inspirada no design "MyDoc" (Doctor Dashboard). O objetivo é garantir consistência visual e evitar a perda de tokens em futuras refatorações.

## 🎨 Paleta de Cores (Extracto MyDoc)

| Token | OKLCH / Hex | Uso |
| :--- | :--- | :--- |
| **Primary (Brand)** | `oklch(0.45 0.18 250)` / `#0041a3` | Sidebar, Cabeçalhos principais, Ações primárias. |
| **Accent (Vibrant)** | `oklch(0.55 0.25 260)` / `#0061ff` | Botões ativos, Destaques, Links. |
| **Success (Mint)** | `oklch(0.80 0.15 170)` / `#00d394` | Tags de status, botões de conclusão, badges. |
| **Background** | `oklch(0.97 0.01 260)` / `#f4f7f9` | Fundo principal da aplicação. |
| **Card / Surface** | `oklch(1.00 0.00 0)` / `#ffffff` | Cartões de conteúdo, inputs, painéis. |
| **Border** | `oklch(0.92 0.01 260)` / `#e2e8f0` | Divisores, bordas de inputs, contornos sutis. |
| **Muted Text** | `oklch(0.55 0.02 260)` / `#64748b` | Subtítulos, labels secundárias, placeholders. |

## 📐 Geometria e Estética

- **Bordas:** Uso predominante de `rounded-2xl` (1rem) e `rounded-3xl` (1.5rem).
- **Sombras:** `shadow-sm` para cartões, `shadow-diffusion` (custom) para painéis flutuantes.
- **Espaçamento:** Padding generoso (`p-8`, `p-10`, `p-12`) para criar respiro visual.
- **Tipografia:** 
  - Títulos: `font-black uppercase italic tracking-tighter`.
  - Labels: `text-[10px] font-black uppercase tracking-[0.2em]`.

## 🛠️ Regras de Implementação

1. **Sidebar:** Deve ser sempre a cor de marca escura (`bg-primary` no tema light/custom).
2. **Cards:** Devem ter fundo branco ou levemente transparente com borda sutil.
3. **Inputs:** Fundo `bg-background` ou `bg-secondary/30` para contraste com o card branco.
4. **Interactive:** Todos os botões devem ter `transition-all duration-300` e `active:scale-95`.

---
*Documentação gerada em 12 de Maio de 2026 para alinhar o CAPS ao padrão MyDoc.*

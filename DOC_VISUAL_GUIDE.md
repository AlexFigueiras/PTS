# Guia Visual: Estilo MyDoc (Doctor Dashboard)

Este guia documenta as decisões de design tomadas para alinhar o CAPS ao padrão visual "MyDoc".

## 🏠 Visão Geral do Layout

O layout segue uma estrutura de **Dashboard SaaS Premium**:
1. **Sidebar Lateral:** Azul profundo, contendo navegação principal e branding.
2. **Main Canvas:** Fundo off-white limpo, agindo como um palco para os cartões.
3. **Cartões de Conteúdo:** Brancos, com bordas muito arredondadas e sombras sutis, contendo as informações e formulários.

## 🎨 Paleta de Cores Implementada

| Elemento | Token CSS | Descrição |
| :--- | :--- | :--- |
| **Sidebar** | `--primary` | Azul Profundo (#0041a3) - Transmite autoridade e confiança. |
| **Fundo** | `--background` | Off-White (#F8FAFC) - Reduz fadiga visual e destaca o conteúdo. |
| **Superfície** | `--card` | Branco Puro (#FFFFFF) - Para máxima clareza. |
| **Ação** | `--accent` | Azul Vibrante (#0061ff) - Para botões que exigem atenção. |
| **Sucesso** | `--dashboard-green` | Verde Menta (#00D394) - Para conclusões e status positivos. |

## 🧩 Componentes Chave

### 1. Sidebar (Navegação)
- **Background:** `--primary`.
- **Items:** Ícones em contorno com texto em `uppercase font-black`.
- **Active State:** Fundo branco com texto azul, criando contraste invertido.

### 2. Formulários (PtsForm / PatientForm)
- **Container:** Cartão branco com `shadow-diffusion`.
- **Inputs:** Bordas arredondadas (`rounded-2xl`), fundo levemente cinza (`bg-secondary/30`) para contraste com o card.
- **Botões:** Grandiosos, com `shadow-diffusion` na cor do botão e efeito de escala no clique.

## 📐 Especificações Técnicas (Tailwind)

- **Radii:** 
  - Geral: `rounded-2xl` (16px)
  - Containers: `rounded-3xl` (24px)
- **Typography:**
  - Headers: `text-4xl font-black uppercase italic tracking-tighter`
  - Labels: `text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60`
- **Shadows:**
  - `shadow-diffusion`: `0 20px 40px -12px rgba(0, 0, 0, 0.06)`

---
*Este guia serve como verdade única para o design do projeto CAPS PTS.*

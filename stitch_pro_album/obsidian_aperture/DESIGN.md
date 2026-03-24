# Design System Document: The Editorial Workspace

## 1. Overview & Creative North Star
### The Creative North Star: "The Silent Gallery"
This design system is built to disappear. In a photo album desktop application, the UI must never compete with the photography; it must act as the gallery walls—structured, premium, and silent. We move beyond the "utility software" look by adopting a **High-End Editorial** aesthetic. 

The system rejects the cluttered "control panel" look of legacy creative tools. Instead, it utilizes intentional asymmetry, massive breathing room (using the upper tiers of our spacing scale), and a sophisticated tonal hierarchy. The goal is to make the user feel like a curator, not just an operator. We achieve this through "Atmospheric Depth"—layering surfaces rather than drawing lines—to create a workspace that feels expensive, focused, and immersive.

---

## 2. Colors & Surface Philosophy
The palette is rooted in deep charcoals and neutrals to ensure color-critical work isn't affected by UI bleed.

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders for sectioning are strictly prohibited. The workspace must remain fluid. Boundaries between the sidebar, the canvas, and the asset strip are defined solely through background color shifts.
*   **Canvas (Background):** `#0e0e0e` (The void where the art sits).
*   **Primary Sidebar:** `surface_container_low` (`#131313`).
*   **Floating Inspector:** `surface_container_high` (`#1f2020`).

### Surface Hierarchy & Nesting
Treat the UI as a series of nested physical layers. 
*   **Level 0 (Base):** `surface` (`#0e0e0e`).
*   **Level 1 (Navigation/Panels):** `surface_container`.
*   **Level 2 (Active States/Modals):** `surface_container_highest`.
By nesting a `surface_container_highest` element inside a `surface_container_low` section, you create a natural "lift" that guides the eye without a single stroke of a pen.

### The "Glass & Gradient" Rule
To prevent the dark theme from feeling "flat" or "muddy," use Glassmorphism for floating overlays (e.g., photo metadata tooltips or quick-action HUDs).
*   **Token:** `surface_variant` at 70% opacity with a 20px backdrop-blur.
*   **Signature Textures:** For primary actions (like "Export Album"), use a subtle linear gradient from `primary` (`#a9caeb`) to `primary_container` (`#294965`) at a 135-degree angle. This provides a "metallic" sheen that feels like high-end camera hardware.

---

## 3. Typography
We use a dual-sans-serif approach to balance architectural strength with functional readability.

*   **Display & Headlines (Manrope):** Chosen for its geometric precision and modern "editorial" feel. Use `display-lg` for welcome screens and `headline-sm` for major workspace sections. High tracking (letter-spacing: 0.05em) should be applied to all Headlines to enhance the premium feel.
*   **Body & Labels (Inter):** Chosen for its exceptional legibility at small sizes. 
    *   **Tool Settings:** Use `label-md` for high information density.
    *   **Contextual Help:** Use `body-sm` in `on_surface_variant` (`#acabaa`) to keep it secondary.
*   **The Hierarchy Rule:** Never use bold weights for body text. Instead, use color shifts (e.g., `on_surface` vs `on_surface_variant`) to denote importance. This maintains the "Silent Gallery" aesthetic.

---

## 4. Elevation & Depth
In this system, depth is felt, not seen.

*   **The Layering Principle:** Stack `surface-container` tiers. A photo thumbnail sitting on the tray should be `surface_container_lowest` to look "recessed," while a selected photo should transition to `surface_bright` to appear "illuminated."
*   **Ambient Shadows:** For floating dialogs, use "The Invisible Lift." 
    *   **Shadow:** `0px 24px 48px rgba(0, 0, 0, 0.5)`. 
    *   Never use pure black shadows on top of colored surfaces; use a tinted shadow derived from the background color to maintain tonal harmony.
*   **The "Ghost Border" Fallback:** If a container lacks contrast against its neighbor, use a Ghost Border: `outline_variant` (`#484848`) at **15% opacity**. It should be felt as a suggestion of an edge, not a hard stop.

---

## 5. Components

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary_container`), `on_primary` text, `sm` (0.125rem) roundedness for a sharp, professional look.
*   **Secondary:** Ghost style. No fill, `outline` border at 30% opacity, `on_surface` text.
*   **Tertiary:** Text only, `on_tertiary` color, uppercase with 0.1em tracking.

### Cards & Photo Slots
*   **The No-Divider Rule:** Forbid the use of divider lines between photos in a grid. Use the Spacing Scale `3` (1rem) or `4` (1.4rem) to create separation through "white" (negative) space.
*   **Hover State:** Photos should not "pop" or scale up. Instead, apply a subtle `surface_tint` overlay at 10% opacity to indicate focus.

### Input Fields
*   **Desktop Utility:** Inputs should be "Understated." Use `surface_container_highest` with a bottom-only border of `outline_variant` (2px). When focused, the bottom border transitions to `primary`.

### Workspace-Specific Components
*   **The Filmstrip:** Use `surface_container_lowest` for the background tray to create a "well" effect where unplaced images reside.
*   **The Inspector:** Use `surface_bright` to distinguish the active property panel from the rest of the dark workspace.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use asymmetrical margins. For example, a left-aligned headline with a massive right-side margin (Spacing `20`) creates a high-end magazine feel.
*   **Do** prioritize `on_surface_variant` for all non-essential UI text to keep the focus on the user's photos.
*   **Do** use the `full` roundedness scale only for toggle switches and status indicators.

### Don’t
*   **Don’t** use pure white (`#FFFFFF`) for text. It causes eye strain in a dark workspace. Always use `on_background` (`#e7e5e5`).
*   **Don’t** use drop shadows on buttons or cards. Use color-tiering to define the hierarchy instead.
*   **Don’t** crowd the interface. If a panel feels tight, increase the spacing by two increments on the scale (e.g., move from `4` to `6`).

### Accessibility Note
While we prioritize a "minimalist" look, ensure that all interactive elements maintain a contrast ratio of at least 4.5:1. Use the `primary` accent (`#a9caeb`) strategically to draw the eye to the "Next Step" in the album creation workflow.
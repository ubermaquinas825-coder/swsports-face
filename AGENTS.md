<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# AGENTS.md — SW Sports

Technical decisions for this project:

- Product photos are CDN assets: cut transparent from the user's original photos via `/mnt/user-uploads/` + Lovable Assets pointers (`src/assets/*.png.asset.json`). Never replace them with AI-generated images; keep the original stamp colors.
- Hero uses a 2.5D presentation (CSS perspective tilt + idle float) in `src/components/Hero.tsx`, kept as a standalone component so it can be swapped for a real GLB/GLTF model later. Do not fake a 3D model from the 2D photos.
- Cart state lives in `src/hooks/use-cart.tsx` (React context + localStorage key `swsports-cart-v1`); product data and WhatsApp helpers in `src/lib/products.ts` are the single source of truth for prices and links.
- Checkout always opens `https://wa.me/5534984350833` in a new tab with the order message built by `buildOrderMessage`; nothing marks a sale as completed.
- Kit offers are rendered disabled ("EM APROVAÇÃO") until the owner approves the commercial values.

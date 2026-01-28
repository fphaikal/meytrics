import express from 'express';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { db } from '../db.js';

// Font loading helper
let fontData;
async function getFont() {
  if (fontData) return fontData;
  // Using Inter font from Google Fonts (Regular 400 & Bold 700 ideally, using one for now or fetching both)
  try {
    const response = await fetch('https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff');
    if (!response.ok) throw new Error('Failed to fetch font');
    fontData = await response.arrayBuffer();
    return fontData;
  } catch (e) {
    console.error('Font fetch error:', e);
    return null;
  }
}

const router = express.Router();

router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const page = await db.statusPage.findUnique({
      where: { slug },
      include: {
        services: true // Maybe count services for status?
      }
    });

    if (!page) return res.status(404).send('Not Found');

    const font = await getFont();
    if (!font) return res.status(500).send('Font configuration error');

    // Design parameters
    const bg = page.hero_bg_color || '#1e2a38';
    const textColor = '#ffffff'; // Assuming dark hero

    // Simple logic to ensure contrast
    // (A comprehensive solution would check brightness, but for now defaulting to white text on user-picked bg)

    const markup = {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          height: '100%',
          width: '100%',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
          backgroundImage: page.bg_pattern === 'dots'
            ? 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)'
            : page.bg_pattern === 'grid'
              ? 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)'
              : 'none',
          backgroundSize: page.bg_pattern === 'dots' ? '20px 20px' : page.bg_pattern === 'grid' ? '40px 40px' : 'auto',
          color: textColor,
          fontFamily: 'Inter',
          position: 'relative',
        },
        children: [
          // Logo Layer (if exists)
          // Since loading external images in satori can be tricky (needs buffer), 
          // and logo_url might be relative or external.
          // For now, we'll skip logo or try to support it if it's simple.
          // satori supports img tags with src if it's a data url or publicly accessible.

          // Content Container
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '40px',
                textAlign: 'center',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                maxWidth: '80%',
              },
              children: [
                {
                  type: 'h1',
                  props: {
                    style: {
                      fontSize: 72,
                      fontWeight: 800,
                      margin: '0 0 20px 0',
                      lineHeight: 1.1,
                      background: 'linear-gradient(180deg, #ffffff 0%, #a5b4fc 100%)',
                      backgroundClip: 'text',
                      color: 'transparent',
                    },
                    children: page.title || page.name
                  }
                },
                {
                  type: 'p',
                  props: {
                    style: {
                      fontSize: 32,
                      opacity: 0.9,
                      margin: 0,
                      lineHeight: 1.4,
                      color: '#e2e8f0'
                    },
                    children: page.subtitle || 'Service Status System'
                  }
                }
              ]
            }
          },

          // Watermark
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                bottom: 40,
                right: 40,
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(0,0,0,0.4)',
                padding: '10px 20px',
                borderRadius: '50px',
                backdropFilter: 'blur(10px)',
              },
              children: [
                {
                  type: 'span',
                  props: {
                    style: { fontSize: 18, marginRight: 8, color: '#94a3b8' },
                    children: 'Powered by'
                  }
                },
                {
                  type: 'span',
                  props: {
                    style: { fontSize: 22, fontWeight: 700, color: 'white', letterSpacing: '1px' },
                    children: 'MEYTRICS'
                  }
                }
              ]
            }
          }
        ]
      }
    };

    const svg = await satori(markup, {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Inter',
          data: font,
          weight: 400,
          style: 'normal',
        },
      ],
    });

    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: 1200 }
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(pngBuffer);

  } catch (e) {
    console.error('OG Generation Error:', e);
    res.status(500).send('Error generating OG image');
  }
});

export default router;

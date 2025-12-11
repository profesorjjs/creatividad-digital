// ================================================
// IA local avanzada: análisis compositivo mejorado
// ================================================
async function computeLocalAdvancedAnalysis(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        // 1. Reescalado razonable para rendimiento
        const maxSide = 400;
        let W = img.width;
        let H = img.height;
        const scale = Math.min(maxSide / W, maxSide / H, 1);
        W = Math.max(1, Math.round(W * scale));
        H = Math.max(1, Math.round(H * scale));

        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, W, H);

        const imageData = ctx.getImageData(0, 0, W, H);
        const data = imageData.data;
        const N = W * H;

        // --------------------------------------------
        // 2. Luminancia normalizada [0,1] + estadísticas básicas
        // --------------------------------------------
        const lum = new Float32Array(N);
        let sumLum = 0;
        let underCount = 0;
        let overCount = 0;

        for (let i = 0; i < N; i++) {
          const r = data[i * 4];
          const g = data[i * 4 + 1];
          const b = data[i * 4 + 2];
          const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255; // 0–1
          lum[i] = L;
          sumLum += L;
          if (L < 0.05) underCount++;
          if (L > 0.95) overCount++;
        }

        const meanLum = sumLum / N;
        const underFrac = underCount / N;
        const overFrac = overCount / N;

        // --------------------------------------------
        // 3. Gradientes (aprox) y mapa de saliencia
        // --------------------------------------------
        const gradX = new Float32Array(N);
        const gradY = new Float32Array(N);
        const gradMag = new Float32Array(N);
        const gradAngle = new Float32Array(N);

        for (let y = 1; y < H - 1; y++) {
          for (let x = 1; x < W - 1; x++) {
            const i = y * W + x;
            const gx = lum[i + 1] - lum[i - 1];
            const gy = lum[i + W] - lum[i - W];
            gradX[i] = gx;
            gradY[i] = gy;
            const mag = Math.sqrt(gx * gx + gy * gy);
            gradMag[i] = mag;
            gradAngle[i] = Math.atan2(gy, gx);
          }
        }

        let maxMag = 0;
        for (let i = 0; i < N; i++) {
          if (gradMag[i] > maxMag) maxMag = gradMag[i];
        }
        if (maxMag > 0) {
          for (let i = 0; i < N; i++) {
            gradMag[i] /= maxMag; // ahora 0–1 → saliencia base
          }
        }

        // --------------------------------------------
        // 4. Centro de saliencia (masa de gradientes)
        // --------------------------------------------
        let cx = 0, cy = 0, totalW = 0;
        for (let y = 0; y < H; y += 2) {
          for (let x = 0; x < W; x += 2) {
            const i = y * W + x;
            const w = gradMag[i];
            cx += x * w;
            cy += y * w;
            totalW += w;
          }
        }

        let centerX = W / 2;
        let centerY = H / 2;
        if (totalW > 0) {
          centerX = cx / totalW;
          centerY = cy / totalW;
        }

        const diag = Math.sqrt(W * W + H * H) || 1;

        // --------------------------------------------
        // 5. Regla de los tercios
        // --------------------------------------------
        const thirdsPoints = [
          { x: W / 3,     y: H / 3 },
          { x: (2 * W) / 3, y: H / 3 },
          { x: W / 3,     y: (2 * H) / 3 },
          { x: (2 * W) / 3, y: (2 * H) / 3 }
        ];

        function dist(x1, y1, x2, y2) {
          const dx = x1 - x2;
          const dy = y1 - y2;
          return Math.sqrt(dx * dx + dy * dy);
        }

        let minThirdDist = Infinity;
        for (const p of thirdsPoints) {
          const d = dist(centerX, centerY, p.x, p.y);
          if (d < minThirdDist) minThirdDist = d;
        }
        const thirdsScore01 = 1 - clamp01(minThirdDist / (0.5 * diag));
        const thirdsScore = +(thirdsScore01 * 10).toFixed(2);

        // --------------------------------------------
        // 6. Horizonte (bordes horizontales en 1/3 o 2/3)
        // --------------------------------------------
        let bestRow = -1;
        let bestRowStrength = 0;

        for (let y = 1; y < H - 1; y++) {
          let rowStrength = 0;
          for (let x = 1; x < W - 1; x++) {
            const i = y * W + x;
            const mag = gradMag[i];
            if (mag <= 0) continue;
            const ang = gradAngle[i]; // dirección del gradiente
            // Borde horizontal → cambio vertical → gradiente casi vertical → sin(ángulo) ≈ 1
            const horizComponent = Math.abs(Math.sin(ang)) * mag;
            rowStrength += horizComponent;
          }
          if (rowStrength > bestRowStrength) {
            bestRowStrength = rowStrength;
            bestRow = y;
          }
        }

        let horizonScore01 = 0;
        if (bestRow >= 0) {
          const yNorm = bestRow / (H - 1);
          const d = Math.min(Math.abs(yNorm - 1 / 3), Math.abs(yNorm - 2 / 3));
          horizonScore01 = 1 - clamp01(d / 0.33);
        }
        const horizonScore = +(horizonScore01 * 10).toFixed(2);

        // --------------------------------------------
        // 7. Proporción áurea (4 puntos áureos)
        // --------------------------------------------
        const phi = 0.618;
        const goldenPoints = [
          { x:  W * phi,       y:  H * phi },
          { x:  W * (1 - phi), y:  H * phi },
          { x:  W * phi,       y:  H * (1 - phi) },
          { x:  W * (1 - phi), y:  H * (1 - phi) }
        ];

        let minGoldenDist = Infinity;
        for (const p of goldenPoints) {
          const d = dist(centerX, centerY, p.x, p.y);
          if (d < minGoldenDist) minGoldenDist = d;
        }
        const goldenScore01 = 1 - clamp01(minGoldenDist / (0.5 * diag));
        const goldenScore = +(goldenScore01 * 10).toFixed(2);

        // --------------------------------------------
        // 8. Saliencia global
        // --------------------------------------------
        let sumSal = 0;
        let countSal = 0;
        for (let i = 0; i < N; i++) {
          sumSal += gradMag[i];
          countSal++;
        }
        const salAvg = countSal > 0 ? sumSal / countSal : 0;
        // Si la media de saliencia es ~0.5, score ~1
        const salienceScore01 = clamp01(salAvg * 2);
        const salienceScore = +(salienceScore01 * 10).toFixed(2);

        // --------------------------------------------
        // 9. Nitidez (Laplaciano sobre luminancia)
        // --------------------------------------------
        let lapSqSum = 0;
        let lapCount = 0;
        for (let y = 1; y < H - 1; y++) {
          for (let x = 1; x < W - 1; x++) {
            const i = y * W + x;
            const lap =
              lum[i - 1] +
              lum[i + 1] +
              lum[i - W] +
              lum[i + W] -
              4 * lum[i];
            lapSqSum += lap * lap;
            lapCount++;
          }
        }
        let sharpnessScore01 = 0;
        if (lapCount > 0) {
          const sharpRaw = Math.sqrt(lapSqSum / lapCount); // típico ~0–0.7
          sharpnessScore01 = clamp01(sharpRaw / 0.5);
        }
        const sharpnessScore = +(sharpnessScore01 * 10).toFixed(2);

        // --------------------------------------------
        // 10. Exposición (clipping + media)
        // --------------------------------------------
        const extremesFrac = underFrac + overFrac;
        const extremesScore = 1 - clamp01(extremesFrac / 0.4); // si >40% extremos → mal
        const midScore = 1 - Math.abs(meanLum - 0.5) / 0.5;     // ideal ~0.5
        const exposureScore01 = clamp01(0.6 * extremesScore + 0.4 * midScore);
        const exposureScore = +(exposureScore01 * 10).toFixed(2);

        // --------------------------------------------
        // 11. Simetría izquierda/derecha
        // --------------------------------------------
        let symDiffSum = 0;
        let symPairs = 0;
        const halfW = Math.floor(W / 2);

        for (let y = 0; y < H; y++) {
          for (let x = 0; x < halfW; x++) {
            const iL = y * W + x;
            const iR = y * W + (W - 1 - x);
            const d = Math.abs(lum[iL] - lum[iR]);
            symDiffSum += d;
            symPairs++;
          }
        }

        let symmetryScore01 = 0;
        if (symPairs > 0) {
          const meanDiff = symDiffSum / symPairs; // 0–1
          symmetryScore01 = 1 - clamp01(meanDiff / 0.5);
        }
        const symmetryScore = +(symmetryScore01 * 10).toFixed(2);

        // --------------------------------------------
        // 12. Equilibrio de masa de saliencia (balance)
        // --------------------------------------------
        let leftMass = 0, rightMass = 0, topMass = 0, bottomMass = 0;

        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const i = y * W + x;
            const s = gradMag[i];
            if (x < W / 2) leftMass += s;
            else rightMass += s;
            if (y < H / 2) topMass += s;
            else bottomMass += s;
          }
        }

        const lrTotal = leftMass + rightMass || 1;
        const tbTotal = topMass + bottomMass || 1;

        const lrRatio = leftMass / lrTotal;
        const tbRatio = topMass / tbTotal;

        const lrDev = Math.abs(lrRatio - 0.5) / 0.5; // 0 → perfecto, 1 → muy desequilibrado
        const tbDev = Math.abs(tbRatio - 0.5) / 0.5;

        const lrBalance = 1 - clamp01(lrDev);
        const tbBalance = 1 - clamp01(tbDev);

        const balanceScore01 = (lrBalance + tbBalance) * 0.5;
        const balanceScore = +(balanceScore01 * 10).toFixed(2);

        // --------------------------------------------
        // 13. Puntuación global combinada
        // --------------------------------------------
        const localAdvancedScore01 = clamp01(
          0.20 * thirdsScore01 +
          0.12 * horizonScore01 +
          0.12 * goldenScore01 +
          0.16 * salienceScore01 +
          0.16 * sharpnessScore01 +
          0.12 * exposureScore01 +
          0.06 * symmetryScore01 +
          0.06 * balanceScore01
        );

        const localAdvancedScore = +(localAdvancedScore01 * 10).toFixed(2);

        resolve({
          thirdsScore,
          horizonScore,
          goldenScore,
          salienceScore,
          sharpnessScore,
          exposureScore,
          symmetryScore,
          balanceScore,
          localAdvancedScore
        });
      } catch (err) {
        console.error("Error IA local avanzada:", err);
        resolve({
          thirdsScore: null,
          horizonScore: null,
          goldenScore: null,
          salienceScore: null,
          sharpnessScore: null,
          exposureScore: null,
          symmetryScore: null,
          balanceScore: null,
          localAdvancedScore: null
        });
      }
    };

    img.onerror = () => {
      console.error("Error cargando imagen para IA avanzada.");
      resolve({
        thirdsScore: null,
        horizonScore: null,
        goldenScore: null,
        salienceScore: null,
        sharpnessScore: null,
        exposureScore: null,
        symmetryScore: null,
        balanceScore: null,
        localAdvancedScore: null
      });
    };

    img.src = dataUrl;
  });
}

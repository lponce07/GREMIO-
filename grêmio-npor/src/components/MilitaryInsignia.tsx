import React, { useState, useEffect } from 'react';
import { getStoredTheme } from '../utils/themeManager';

interface MilitaryInsigniaProps {
  className?: string;
  alt?: string;
  customSrc?: string;
}

/**
 * Emblema Oficial da Turma NPOR
 * Suporta imagem personalizada definida pelo Administrador Geral (customSrc ou tema salvo),
 * com fallback para /assets/SIMBOLO_NPOR.jpg e fallback SVG heráldico em tons verde-oliva e dourado.
 */
export function MilitaryInsignia({
  className = "w-10 h-10",
  alt = "Emblema Oficial da Turma NPOR",
  customSrc,
}: MilitaryInsigniaProps) {
  const [currentSrcIndex, setCurrentSrcIndex] = useState<number>(0);
  const [hasError, setHasError] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  // Determina fonte personalizada: prop direta OU customLogoUrl do tema ativo
  const effectiveCustomSrc = customSrc || getStoredTheme()?.customLogoUrl || undefined;

  const candidateSources = React.useMemo(() => {
    const list: string[] = [];
    if (effectiveCustomSrc && effectiveCustomSrc.trim()) {
      list.push(effectiveCustomSrc);
    }
    list.push('/assets/SIMBOLO_NPOR.jpg', '/assets/simbolo-npor.jpg', '/assets/SIMBOLO NPOR.jpg');
    return list;
  }, [effectiveCustomSrc]);

  useEffect(() => {
    setCurrentSrcIndex(0);
    setHasError(false);
    setImageLoaded(false);
  }, [effectiveCustomSrc]);

  const handleImageError = () => {
    if (currentSrcIndex < candidateSources.length - 1) {
      setCurrentSrcIndex((prev) => prev + 1);
    } else {
      setHasError(true);
    }
  };

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {/* Fallback SVG exibido caso a imagem falhe ou enquanto estiver em transferência */}
      {(hasError || !imageLoaded) && (
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${className} object-contain rounded-xs select-none ${imageLoaded ? 'hidden' : 'block'}`}
          aria-label={alt}
        >
          {/* Escudo militar verde-oliva */}
          <path
            d="M50 6 L86 22 V54 C86 73 50 94 50 94 C50 94 14 73 14 54 V22 Z"
            fill="#2D3B36"
            stroke="#D4AF37"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* Filete interno dourado */}
          <path
            d="M50 13 L79 26 V52 C79 67 50 85 50 85 C50 85 21 67 21 52 V26 Z"
            fill="#1E2824"
            stroke="#B8860B"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Silhueta das Torres Fortificadas de Engenharia/Artilharia */}
          <rect x="23" y="34" width="10" height="14" fill="#20B2AA" opacity="0.85" stroke="#D4AF37" strokeWidth="1" />
          <path d="M22 34 L25 30 H31 L34 34 Z" fill="#20B2AA" stroke="#D4AF37" strokeWidth="1" />
          <rect x="67" y="34" width="10" height="14" fill="#20B2AA" opacity="0.85" stroke="#D4AF37" strokeWidth="1" />
          <path d="M66 34 L69 30 H75 L78 34 Z" fill="#20B2AA" stroke="#D4AF37" strokeWidth="1" />

          {/* Lâmina / Punhal de Combate em Prata e Ouro */}
          <path
            d="M26 53 L74 53 L70 48 L26 48 Z"
            fill="#E2E8F0"
            stroke="#64748B"
            strokeWidth="1"
          />
          <line x1="26" y1="50.5" x2="68" y2="50.5" stroke="#94A3B8" strokeWidth="0.8" />
          <rect x="23" y="47" width="5" height="7" fill="#4B5320" stroke="#D4AF37" strokeWidth="1" rx="0.5" />

          {/* Estrela dourada de 5 pontas */}
          <polygon
            points="50,60 52.5,67 60,67 54,71.5 56,78.5 50,74 44,78.5 46,71.5 40,67 47.5,67"
            fill="#F4D03F"
            stroke="#B8860B"
            strokeWidth="0.8"
          />

          {/* Sigla NPOR em tipografia dourada de alta precisão */}
          <text
            x="50"
            y="42"
            textAnchor="middle"
            fill="#F5DEB3"
            stroke="#1A2421"
            strokeWidth="0.5"
            fontSize="10"
            fontWeight="900"
            fontFamily="monospace, sans-serif"
            letterSpacing="1"
          >
            NPOR
          </text>
          <text
            x="50"
            y="87"
            textAnchor="middle"
            fill="#D4AF37"
            fontSize="4.5"
            fontWeight="bold"
            fontFamily="sans-serif"
            letterSpacing="0.5"
          >
            OFICIAIS DA RESERVA
          </text>
        </svg>
      )}

      {/* Imagem Oficial do Emblema da Turma */}
      {!hasError && (
        <img
          src={candidateSources[currentSrcIndex]}
          alt={alt}
          className={`${className} object-contain rounded-xs select-none ${
            imageLoaded ? 'opacity-100' : 'opacity-0 absolute'
          }`}
          onLoad={() => setImageLoaded(true)}
          onError={handleImageError}
        />
      )}
    </div>
  );
}

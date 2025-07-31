export const themes = {
  dark: {
    colors: {
      background: "#18181A",
      surface: "#222225",
      surfaceAlt: "#28282B",
      primary: "#FFF",
      secondary: "#CBCBCF",
      accent: "#36C7F4",
      warning: "#FFD600",
      danger: "#FF5A5F",
      success: "#31CB00",
      border: "#333337",
      inputBg: "#202023",
      buttonPrimaryBg: "#FFF",
      buttonPrimaryText: "#18181A",
      buttonSecondaryBg: "#222225",
      buttonSecondaryText: "#CBCBCF",
      text: "#FFF",
      textSecondary: "#CBCBCF",
      textMuted: "#999CA7"
    },
    sidebar: {
      bg: "#202023",
      active: "#27272A",
      text: "#888A91",
      accentText: "#FFF"
    },
    components: {
      card: {
        background: "#222225",
        hover: "#28282B"
      },
      issueItem: {
        background: "#18181A",
        hover: "#23232A"
      },
      button: {
        primary: {
          bg: "#FFF",
          text: "#18181A",
          hover: "#F0F0F0"
        },
        secondary: {
          bg: "#222225",
          text: "#CBCBCF",
          hover: "#28282B"
        }
      }
    }
  },
  light: {
    colors: {
      background: "#FFFFFF",
      surface: "#F8F9FA",
      surfaceAlt: "#F1F3F4",
      primary: "#000000",
      secondary: "#4F5B66",
      accent: "#2196F3",
      warning: "#FF9800",
      danger: "#F44336",
      success: "#4CAF50",
      border: "#E0E4E7",
      inputBg: "#FFFFFF",
      buttonPrimaryBg: "#000000",
      buttonPrimaryText: "#FFFFFF",
      buttonSecondaryBg: "#F8F9FA",
      buttonSecondaryText: "#4F5B66",
      text: "#000000",
      textSecondary: "#4F5B66",
      textMuted: "#9CA3AF"
    },
    sidebar: {
      bg: "#F8F9FA",
      active: "#E3F2FD",
      text: "#6B7280",
      accentText: "#000000"
    },
    components: {
      card: {
        background: "#FFFFFF",
        hover: "#F8F9FA"
      },
      issueItem: {
        background: "#FFFFFF",
        hover: "#F8F9FA"
      },
      button: {
        primary: {
          bg: "#000000",
          text: "#FFFFFF",
          hover: "#333333"
        },
        secondary: {
          bg: "#F8F9FA",
          text: "#4F5B66",
          hover: "#E3F2FD"
        }
      }
    }
  }
}

export const typography = {
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 600,
  heading1: { fontSize: "2.8rem", fontWeight: 600, lineHeight: "1.2" },
  heading2: { fontSize: "2rem", fontWeight: 600, lineHeight: "1.25" },
  heading3: { fontSize: "1.5rem", fontWeight: 500, lineHeight: "1.3" },
  body: { fontSize: "1rem", fontWeight: 400, lineHeight: "1.6" },
  subtle: { fontSize: "0.92rem", fontWeight: 400, lineHeight: "1.5" }
}

export const borders = {
  radiusSM: "6px",
  radius: "10px",
  radiusLG: "18px"
}

export const shadows = {
  card: "0 2px 8px 0 rgba(10,11,13,0.14)",
  cardLight: "0 2px 8px 0 rgba(0,0,0,0.1)"
}

export const spacing = {
  xs: "6px",
  sm: "12px",
  md: "20px",
  lg: "32px"
}

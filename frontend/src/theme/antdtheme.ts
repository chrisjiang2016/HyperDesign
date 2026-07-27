import type { ThemeConfig } from 'antd'

export const hyperDesignTheme: ThemeConfig = {
  token: {
    colorPrimary: '#2457d6',
    colorInfo: '#175cd3',
    colorSuccess: '#067647',
    colorWarning: '#b54708',
    colorError: '#b42318',
    colorText: '#182230',
    colorTextSecondary: '#475467',
    colorTextTertiary: '#667085',
    colorTextQuaternary: '#98a2b3',
    colorBorder: '#dfe3eb',
    colorBorderSecondary: '#eaecf0',
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f5f7fa',
    colorFillAlter: '#f9fafb',
    colorLink: '#2457d6',
    colorLinkHover: '#1d49b7',
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    controlHeight: 40,
    controlHeightLG: 44,
    fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    boxShadowSecondary: '0 8px 20px rgba(16, 24, 40, 0.10)',
  },
  components: {
    Button: {
      borderRadius: 8,
      controlHeight: 40,
      controlHeightLG: 44,
      fontWeight: 600,
      primaryShadow: 'none',
    },
    Card: {
      borderRadiusLG: 12,
    },
    Input: {
      borderRadius: 8,
      controlHeight: 40,
      activeShadow: '0 0 0 3px rgba(36, 87, 214, 0.22)',
    },
    Modal: {
      borderRadiusLG: 12,
    },
    Table: {
      headerBg: '#f9fafb',
      headerColor: '#475467',
    },
    Tabs: {
      itemSelectedColor: '#2457d6',
      inkBarColor: '#2457d6',
    },
  },
}

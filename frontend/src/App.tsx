import { RouterProvider } from 'react-router-dom'
import { ConfigProvider, App as AntdApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { router } from '@/router'
import { hyperDesignTheme } from '@/theme/antdtheme'
import { AuthBootstrap } from '@/components/auth/AuthBootstrap'

export default function App() {
  return (
    <ConfigProvider locale={zhCN} theme={hyperDesignTheme}>
      <AntdApp>
        <AuthBootstrap />
        <RouterProvider router={router} />
      </AntdApp>
    </ConfigProvider>
  )
}

import { Result, Button } from 'antd'
import { Link } from 'react-router-dom'

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <Result
      status="info"
      title={title}
      subTitle="这个页面下一步继续迁移，当前先把前端工程骨架和首批核心页面跑通。"
      extra={
        <Button type="primary">
          <Link to="/">返回首页</Link>
        </Button>
      }
    />
  )
}

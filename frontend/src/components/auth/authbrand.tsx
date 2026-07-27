interface AuthBrandProps {
  title: string
  description: string
}

export function AuthBrand({ title, description }: AuthBrandProps) {
  return (
    <header className="hd-auth-brand">
      <div className="hd-auth-brand__mark" aria-hidden="true">H</div>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  )
}

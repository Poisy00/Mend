import { FormEvent } from "react"
import { createRoot } from "react-dom/client"
import {
  Button,
  Card,
  Field,
  Form,
  Input,
  Label,
  PasswordField,
} from "@santi020k/lumen-react"
import "@santi020k/lumen-react/styles.css"
import "./styles.css"

function MendLogin() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    if (!form.reportValidity()) return

    const data = new FormData(form)
    window.dispatchEvent(
      new CustomEvent("mend:login-submit", {
        detail: {
          username: data.get("username"),
          password: data.get("password"),
        },
      }),
    )
  }

  return (
    <main className="login-shell">
      <div className="brand-lockup" aria-label="Mend">
        <span className="brand-mark" aria-hidden="true">
          <span />
          <span />
        </span>
        <span className="wordmark">Mend</span>
      </div>

      <div className="seam" aria-hidden="true">
        <span className="seam-segment seam-segment-top" />
        <span className="seam-knot" />
        <span className="seam-segment seam-segment-bottom" />
      </div>

      <Card as="section" className="login-card">
        <Form className="login-form" onSubmit={handleSubmit} noValidate={false}>
          <Field className="field-block">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              visualSize="lg"
              data-error-required="Enter your username."
            />
          </Field>

          <div className="field-block password-block">
            <PasswordField
              name="password"
              label="Password"
              autoComplete="current-password"
              required
              showLabel="Show password"
              hideLabel="Hide password"
              data-error-required="Enter your password."
            />
          </div>

          <Button className="login-button" type="submit" size="lg">
            Log in
          </Button>
        </Form>

        <p className="recovery-note">
          Forgot your password? Contact your administrator.
        </p>
      </Card>
    </main>
  )
}

createRoot(document.getElementById("root")!).render(<MendLogin />)

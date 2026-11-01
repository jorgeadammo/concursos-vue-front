import { test, expect } from '@playwright/test'

// See here how to get started:
// https://playwright.dev/docs/intro
test('exibe formulário de login na página inicial', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Entre na sua conta' })).toBeVisible()
  await expect(page.getByLabel('E-mail')).toBeVisible()
  await expect(page.getByLabel('Senha')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Entrar na plataforma' })).toBeVisible()
})

<script setup lang="ts">
import { ref } from 'vue'
import { getAuthSession, login, logout, type AuthSession } from '../services/auth'
import { notifyError } from '../services/notifications'

const email = ref('')
const password = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')
const authSession = ref<AuthSession | null>(getAuthSession())
const bancasUrl = `${import.meta.env.BASE_URL}bancas`
const concursosUrl = `${import.meta.env.BASE_URL}concursos`

async function submitLogin() {
  errorMessage.value = ''
  isSubmitting.value = true

  try {
    authSession.value = await login(email.value, password.value)
  } catch (error) {
    errorMessage.value =
      error instanceof TypeError
        ? 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
        : error instanceof Error
          ? error.message
          : 'Ocorreu um erro inesperado. Tente novamente.'
    notifyError(errorMessage.value)
  } finally {
    isSubmitting.value = false
  }
}

function submitLogout() {
  logout()
  authSession.value = null
}
</script>

<template>
  <main class="login-page">
    <section class="study-panel" aria-label="Apresentação da plataforma">
      <a class="brand" href="/" aria-label="Aprova, página inicial">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none">
            <path d="M7 16.5 13 22l12-13" />
          </svg>
        </span>
        <span>aprova<span class="brand-period">.</span></span>
      </a>

      <div class="study-copy">
        <span class="eyebrow"><span class="eyebrow-dot"></span> SEU PRÓXIMO PASSO COMEÇA AQUI</span>
        <h1>Seu futuro<br />merece <span>aprovação.</span></h1>
        <p>Organize seus estudos, acompanhe seu progresso e chegue mais perto da sua aprovação todos os dias.</p>

        <div class="study-note">
          <span class="note-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M5 19V9m7 10V5m7 14v-7" />
            </svg>
          </span>
          <span><strong>Um passo de cada vez.</strong><br />A sua jornada começa com foco.</span>
        </div>
      </div>

      <span class="panel-decoration decoration-one"></span>
      <span class="panel-decoration decoration-two"></span>
      <p class="panel-footer">Feito para quem não desiste dos seus objetivos.</p>
    </section>

    <section
      class="form-panel"
      :aria-labelledby="authSession ? 'welcome-title' : 'login-title'"
    >
      <div v-if="authSession" class="welcome-card">
        <div class="mobile-brand" aria-hidden="true">
          <span class="brand-mark">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M7 16.5 13 22l12-13" />
            </svg>
          </span>
          <span>aprova<span class="brand-period">.</span></span>
        </div>

        <div class="welcome-copy">
          <span class="welcome-label">SUA JORNADA CONTINUA AQUI</span>
          <h2 id="welcome-title">Boas-vindas, {{ authSession.user.name }}!</h2>
          <p>Que bom ter você de volta. Confira os dados da sua conta:</p>
        </div>

        <dl class="profile-details">
          <div>
            <dt>E-mail</dt>
            <dd>{{ authSession.user.email }}</dd>
          </div>
          <div>
            <dt>Perfil</dt>
            <dd>{{ authSession.user.role }}</dd>
          </div>
          <div>
            <dt>Área</dt>
            <dd>{{ authSession.user.area }}</dd>
          </div>
        </dl>

        <a class="submit-button manage-link" :href="bancasUrl">
          Gerenciar bancas
        </a>
        <a class="submit-button manage-link" :href="concursosUrl">Gerenciar concursos</a>
        <button type="button" class="submit-button welcome-logout" @click="submitLogout">
          Sair da conta
        </button>
      </div>

      <div v-else class="login-card">
        <div class="mobile-brand" aria-hidden="true">
          <span class="brand-mark">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M7 16.5 13 22l12-13" />
            </svg>
          </span>
          <span>aprova<span class="brand-period">.</span></span>
        </div>

        <div class="welcome-copy">
          <span class="welcome-label">BEM-VINDO DE VOLTA</span>
          <h2 id="login-title">Entre na sua conta</h2>
          <p>Continue de onde sua jornada parou.</p>
        </div>

        <form class="login-form" @submit.prevent="submitLogin">
          <label for="email">E-mail</label>
          <div class="input-wrap">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
              <path d="m4.5 7 7.5 6 7.5-6" />
            </svg>
            <input
              id="email"
              v-model="email"
              type="email"
              name="email"
              autocomplete="email"
              placeholder="voce@exemplo.com"
              required
              :disabled="isSubmitting"
            />
          </div>

          <label for="password">Senha</label>
          <div class="input-wrap">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="4.5" y="10" width="15" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" />
            </svg>
            <input
              id="password"
              v-model="password"
              type="password"
              name="password"
              autocomplete="current-password"
              placeholder="Digite sua senha"
              required
              :disabled="isSubmitting"
            />
          </div>

          <p v-if="errorMessage" class="form-message error-message" role="alert">
            {{ errorMessage }}
          </p>
          <button class="submit-button" type="submit" :disabled="isSubmitting">
            <span>{{ isSubmitting ? 'Entrando...' : 'Entrar na plataforma' }}</span>
            <svg v-if="!isSubmitting" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
            <span v-else class="loading-indicator" aria-hidden="true"></span>
          </button>
        </form>

        <div class="secure-note">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 3 19 6v5c0 4.7-3 8-7 10-4-2-7-5.3-7-10V6l7-3Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span>Seus dados estão protegidos e seguros</span>
        </div>
      </div>

      <p class="copyright">© 2026 Aprova. Todos os direitos reservados.</p>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  display: grid;
  grid-template-columns: minmax(380px, 0.92fr) minmax(520px, 1.08fr);
  min-height: 100vh;
  background: #fff;
}

.study-panel {
  position: relative;
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  overflow: hidden;
  padding: 48px clamp(36px, 6vw, 92px) 34px;
  color: #fff;
  background: #142a24;
}

.study-panel::before {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 82% 78%, rgb(71 130 99 / 24%), transparent 48%),
    linear-gradient(145deg, transparent 40%, rgb(7 20 17 / 30%));
  content: '';
}

.brand,
.mobile-brand {
  position: relative;
  z-index: 1;
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 10px;
  color: #fff;
  font-size: 25px;
  font-weight: 750;
  letter-spacing: -1.3px;
  text-decoration: none;
}

.brand-mark {
  display: grid;
  width: 35px;
  height: 35px;
  place-items: center;
  border-radius: 11px;
  background: #c1e17d;
}

.brand-mark svg {
  width: 23px;
  stroke: #1b332a;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2.8;
}

.brand-period {
  color: #c1e17d;
}

.study-copy {
  position: relative;
  z-index: 1;
  max-width: 510px;
  margin: auto 0;
  padding: 64px 0 76px;
}

.eyebrow,
.welcome-label {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #c1e17d;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 1.45px;
}

.eyebrow-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #c1e17d;
  box-shadow: 0 0 13px rgb(193 225 125 / 70%);
}

h1 {
  margin: 24px 0 18px;
  font-size: clamp(42px, 5vw, 64px);
  font-weight: 650;
  letter-spacing: -3.2px;
  line-height: 1.06;
}

h1 span {
  color: #c1e17d;
}

.study-copy > p {
  max-width: 400px;
  color: #c2cec8;
  font-size: 15px;
  line-height: 1.8;
}

.study-note {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 40px;
  color: #c2cec8;
  font-size: 12px;
  line-height: 1.7;
}

.study-note strong {
  color: #fff;
  font-weight: 600;
}

.note-icon {
  display: grid;
  width: 43px;
  height: 43px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 13%);
  border-radius: 13px;
  background: rgb(255 255 255 / 6%);
}

.note-icon svg {
  width: 21px;
  stroke: #c1e17d;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.6;
}

.panel-decoration {
  position: absolute;
  width: 310px;
  height: 310px;
  border: 1px solid rgb(255 255 255 / 6%);
  border-radius: 50%;
  pointer-events: none;
}

.decoration-one {
  right: -172px;
  bottom: -180px;
}

.decoration-two {
  right: -130px;
  bottom: -138px;
  width: 225px;
  height: 225px;
}

.panel-footer {
  position: relative;
  z-index: 1;
  color: #a7b8ae;
  font-size: 11px;
}

.form-panel {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 40px 24px;
}

.login-card {
  width: min(100%, 390px);
  margin: auto;
}

.welcome-card {
  width: min(100%, 430px);
  margin: auto;
}

.mobile-brand {
  display: none;
  margin-bottom: 50px;
  color: #1b332a;
}

.mobile-brand .brand-period {
  color: #638b40;
}

.welcome-copy {
  margin-bottom: 34px;
}

.welcome-label {
  color: #668b45;
  font-size: 9px;
}

h2 {
  margin: 13px 0 8px;
  color: #1d2924;
  font-size: 30px;
  font-weight: 650;
  letter-spacing: -1.1px;
}

.welcome-copy p {
  color: #818a85;
  font-size: 13px;
}

.login-form {
  display: flex;
  flex-direction: column;
}

.login-form label {
  margin: 0 0 9px;
  color: #303b36;
  font-size: 12px;
  font-weight: 650;
}

.input-wrap {
  position: relative;
  margin-bottom: 23px;
}

.input-icon {
  position: absolute;
  top: 50%;
  left: 15px;
  width: 18px;
  transform: translateY(-50%);
  stroke: #99a49d;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5;
  pointer-events: none;
}

.input-wrap input {
  width: 100%;
  height: 49px;
  padding: 0 14px 0 44px;
  border: 1px solid #e3e8e4;
  border-radius: 9px;
  outline: none;
  color: #26332c;
  background: #fff;
  font: inherit;
  font-size: 13px;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.input-wrap input::placeholder {
  color: #abb3ae;
}

.input-wrap input:focus {
  border-color: #749450;
  box-shadow: 0 0 0 3px rgb(116 148 80 / 12%);
}

.input-wrap input:disabled {
  background: #f7f8f7;
}

.form-message {
  margin: -4px 0 16px;
  font-size: 12px;
  line-height: 1.5;
}

.error-message {
  color: #b83c36;
}

.profile-details {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0 0 24px;
  border: 1px solid #e3e8e4;
  border-radius: 10px;
  background: #fff;
}

.profile-details > div {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  gap: 12px;
  padding: 14px 16px;
}

.profile-details > div + div {
  border-top: 1px solid #edf0ed;
}

.profile-details dt {
  color: #818a85;
  font-size: 12px;
}

.profile-details dd {
  overflow-wrap: anywhere;
  color: #303b36;
  font-size: 12px;
  font-weight: 600;
}

.welcome-logout {
  margin-top: 10px;
}

.manage-link {
  margin-top: 0;
  text-decoration: none;
}

.submit-button {
  display: flex;
  width: 100%;
  height: 50px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 5px;
  border: 0;
  border-radius: 9px;
  color: #1d3024;
  background: #c1e17d;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  transition: background-color 160ms ease, transform 160ms ease;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #b4d86c;
}

.submit-button:focus-visible {
  outline: 3px solid rgb(91 123 61 / 35%);
  outline-offset: 3px;
}

.submit-button:disabled {
  cursor: wait;
  opacity: 0.75;
}

.submit-button svg {
  width: 17px;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.loading-indicator {
  width: 15px;
  height: 15px;
  border: 2px solid rgb(29 48 36 / 35%);
  border-top-color: #1d3024;
  border-radius: 50%;
  animation: spin 700ms linear infinite;
}

.secure-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-top: 27px;
  color: #909a94;
  font-size: 10px;
}

.secure-note svg {
  width: 15px;
  stroke: #82966f;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.6;
}

.copyright {
  color: #a1a9a4;
  font-size: 10px;
  text-align: center;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 850px) {
  .login-page {
    grid-template-columns: minmax(310px, 0.8fr) minmax(410px, 1.2fr);
  }

  .study-panel {
    padding-right: 35px;
    padding-left: 35px;
  }
}

@media (max-width: 680px) {
  .login-page {
    display: block;
    min-height: 100vh;
  }

  .study-panel {
    display: none;
  }

  .form-panel {
    min-height: 100vh;
    padding: 28px 25px 20px;
  }

  .login-card {
    width: min(100%, 390px);
  }

  .mobile-brand {
    display: inline-flex;
    margin-bottom: 54px;
  }
}

@media (max-width: 380px) {
  .form-panel {
    padding-right: 20px;
    padding-left: 20px;
  }

  h2 {
    font-size: 27px;
  }
}
</style>

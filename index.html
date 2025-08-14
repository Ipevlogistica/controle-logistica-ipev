<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Login - Controle de Logística IPEV</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
</head>
<body class="bg-blue-100 flex items-center justify-center min-h-screen">

  <div class="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm">
    <h1 class="text-2xl font-bold text-center mb-6 text-blue-900">Acesso ao Sistema</h1>

    <form id="loginForm" class="space-y-4">
      <input type="email" id="email" placeholder="E-mail" required
             class="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-500">

      <input type="password" id="senha" placeholder="Senha" required
             class="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-500">

      <button type="submit"
              class="w-full bg-blue-700 text-white py-2 rounded hover:bg-blue-800">Entrar</button>
    </form>

    <p id="erroMsg" class="text-red-600 text-center mt-4 hidden"></p>
  </div>

  <script type="module">
    import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js'

    const supabaseUrl = 'https://ilsbyrvnrkutwynujfhs.supabase.co'
    const supabaseKey = 'SUA_ANON_KEY_AQUI'
    const supabase = createClient(supabaseUrl, supabaseKey)

    const form = document.getElementById('loginForm')
    const erroMsg = document.getElementById('erroMsg')
    const redirectUrl = 'index.html' // Página para onde vai após login

    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      erroMsg.classList.add('hidden')

      const email = document.getElementById('email').value.trim()
      const senha = document.getElementById('senha').value

      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

      if (error) {
        erroMsg.textContent = 'Falha no login: ' + error.message
        erroMsg.classList.remove('hidden')
      } else {
        window.location.href = redirectUrl
      }
    })
  </script>

</body>
</html>

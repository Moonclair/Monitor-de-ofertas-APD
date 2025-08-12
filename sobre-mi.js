    document.addEventListener('DOMContentLoaded', () => {
  const copyBtn = document.getElementById('copy-cbu-btn');
  const cbuText = "0140051903515554281300";
  let timeoutId = null;

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(cbuText).then(() => {
      copyBtn.textContent = "✓ Copiado";
      copyBtn.style.backgroundColor = "#D1E0D6";
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        copyBtn.innerHTML = "📋 Copiar";
        copyBtn.style.backgroundColor = "#E0F2E5";
      }, 2000);
    }).catch(() => {
      alert('No se pudo copiar el CBU automáticamente. Por favor, copialo manualmente.');
    });
  });
  });
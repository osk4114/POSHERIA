document.addEventListener('DOMContentLoaded', function() {
    // Obtener todos los botones de pestañas y contenidos
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    // Función para cambiar de pestaña
    function cambiarPestaña(tabId) {
        // Remover clase active de todos los botones y contenidos
        tabButtons.forEach(button => button.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // Agregar clase active al botón seleccionado
        const selectedButton = document.querySelector(`[data-tab="${tabId}"]`);
        if (selectedButton) {
            selectedButton.classList.add('active');
        }

        // Mostrar el contenido correspondiente
        const selectedContent = document.getElementById(tabId);
        if (selectedContent) {
            selectedContent.classList.add('active');
        }
    }

    // Agregar event listeners a los botones
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            cambiarPestaña(tabId);
        });
    });

    // Activar la primera pestaña por defecto
    const firstTab = tabButtons[0];
    if (firstTab) {
        const firstTabId = firstTab.getAttribute('data-tab');
        cambiarPestaña(firstTabId);
    }
});

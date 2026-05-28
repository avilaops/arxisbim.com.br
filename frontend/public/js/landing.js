// FAQ Accordion
document.addEventListener('DOMContentLoaded', () => {
  const faqItems = document.querySelectorAll('.faq-item');
  
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      
      // Close all items
      faqItems.forEach(i => i.classList.remove('active'));
      
      // Open clicked item if it was closed
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });

  // Smooth scroll for navigation links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const navHeight = document.querySelector('.navbar').offsetHeight;
        const targetPosition = target.offsetTop - navHeight;
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // Form submission
  const form = document.getElementById('contactForm');
  const formWrapper = form.parentElement;
  const successMessage = document.getElementById('formSuccess');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        form.style.display = 'none';
        successMessage.style.display = 'block';
      } else {
        throw new Error('Erro ao enviar formulário');
      }
    } catch (error) {
      alert('Erro ao enviar formulário. Por favor, tente novamente.');
      console.error('Error:', error);
    }
  });

  // Navbar scroll effect
  let lastScroll = 0;
  const navbar = document.querySelector('.navbar');

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
      navbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    } else {
      navbar.style.boxShadow = 'none';
    }

    lastScroll = currentScroll;
  });
});

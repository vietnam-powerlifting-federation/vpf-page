<template>
  <footer class="footer">
    <div class="container mx-auto px-4">
      <div class="footer-content">
        <div class="footer-section">
          <h3 class="footer-title">{{ $t("footer.links") }}</h3>
          <ul class="footer-links">
            <li>
              <NuxtLinkLocale to="/" class="footer-link">{{ $t("nav.home") }}</NuxtLinkLocale>
            </li>
            <li>
              <NuxtLinkLocale to="/about" class="footer-link">{{ $t("nav.about") }}</NuxtLinkLocale>
            </li>
            <li>
              <NuxtLinkLocale to="/membership" class="footer-link">{{ $t("nav.membership") }}</NuxtLinkLocale>
            </li>
            <li>
              <NuxtLinkLocale to="/championships" class="footer-link">{{ $t("nav.championships") }}</NuxtLinkLocale>
            </li>
            <li>
              <NuxtLinkLocale to="/news" class="footer-link">{{ $t("nav.news") }}</NuxtLinkLocale>
            </li>
            <li>
              <NuxtLinkLocale to="/contact" class="footer-link">{{ $t("nav.contact") }}</NuxtLinkLocale>
            </li>
          </ul>
        </div>
        <div class="footer-section">
          <h3 class="footer-title">{{ $t("footer.social") }}</h3>
          <div class="social-links">
            <a
              v-for="(platform, key) in CONTACT_INFO.social"
              :key="key"
              :href="platform.url"
              class="social-link"
              :aria-label="platform.ariaLabel"
            >
              {{ platform.name }}
            </a>
          </div>
        </div>
        <div class="footer-section">
          <h3 class="footer-title">{{ $t("contact.title") }}</h3>
          <p class="footer-text">{{ $t("contact.address") }}: {{ CONTACT_INFO.address.full }}</p>
          <p class="footer-text">{{ $t("contact.phone") }}: {{ CONTACT_INFO.phone }}</p>
          <p class="footer-text">{{ $t("contact.emailLabel") }}: {{ CONTACT_INFO.email }}</p>
        </div>
      </div>
      <div class="footer-bottom">
        <p class="copyright">{{ $t("footer.copyright", { year: new Date().getFullYear() }) }}</p>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { CONTACT_INFO } from "~/lib/config/contact"
</script>

<style scoped>
.footer {
  color: white;
  padding: 40px 0 20px;
  margin-top: auto;
  background-color: var(--p-surface-800);
}

.footer-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.footer-section {
  display: flex;
  flex-direction: column;
}

.footer-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: white;
}

.footer-links {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-links li {
  margin-bottom: 0.5rem;
}

.footer-link {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  transition: color 0.3s ease;
}

.footer-link:hover {
  color: white;
}

.social-links {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.social-link {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  transition: color 0.3s ease;
}

.social-link:hover {
  color: white;
}

.footer-text {
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.footer-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 1rem;
  text-align: center;
}

.copyright {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
  margin: 0;
}

@media (max-width: 768px) {
  .footer-content {
    grid-template-columns: 1fr;
  }
}
</style>

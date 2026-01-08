export const CONTACT_INFO = {
  address: {
    street: "123 Powerlifting Street",
    city: "London",
    country: "UK",
    postalCode: "SW1A 1AA",
    // Full formatted address for display
    full: "123 Powerlifting Street, London, UK",
    // Multi-line format for detailed display
    formatted: "123 Powerlifting Street\nLondon, UK\nSW1A 1AA",
  },
  phone: "+44 20 1234 5678",
  email: "contact@powerliftingvietnam.com",
  social: {
    facebook: {
      name: "Facebook",
      url: "https://www.facebook.com/vietpowerlifting",
      ariaLabel: "Facebook",
    },
    twitter: {
      name: "Youtube",
      url: "https://www.youtube.com/@vietnampowerliftingfederation",
      ariaLabel: "Youtube",
    },
    instagram: {
      name: "Instagram",
      url: "https://www.instagram.com/vpf.vietnampowerliftingfed/",
      ariaLabel: "Instagram",
    },
  },
} as const

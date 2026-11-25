export const site = {
  name: "NewVisa Global Odyssey",
  tagline: "Your Journey Abroad Starts Here",
  description:
    "Immigration & visa consultancy plus flight and hotel booking — check your eligibility, talk to a counsellor, track your application and plan your travel in one place.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  contact: {
    email: "newvisallp@gmail.com",
    phone: "+91 81300 91200",
    address: {
      lines: ["A-7/206-207, 3rd Floor", "Rohini Sector 17"],
      city: "New Delhi",
      postalCode: "110089",
      state: "Delhi",
      country: "India",
    },
  },
  /** Public business registration details (shown in the footer, About and Contact pages). */
  business: {
    tradeName: "New Visa Global Odyssey",
    legalName: "Rohit Grover",
    proprietor: "Rohit Grover",
    constitution: "Proprietorship",
    gstin: "07AQUPG7824J1Z9",
    udyam: "UDYAM-DL-04-0061196",
    enterpriseType: "Micro",
  },
};

/** Single-line postal address, e.g. for the footer. */
export const siteAddress = [...site.contact.address.lines, `${site.contact.address.city} ${site.contact.address.postalCode}`].join(", ");

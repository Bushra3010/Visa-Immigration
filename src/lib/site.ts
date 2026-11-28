export const site = {
  name: "NewVisa Global Odyssey",
  tagline: "Your Journey Abroad Starts Here",
  description:
    "Immigration & visa consultancy — check your eligibility, talk to a counsellor, upload documents and track your application in one place.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  contact: {
    email: "newvisallp@gmail.com",
    phone: "+91 81300 91200",
    address: {
      lines: ["B-7/172, Ground Floor", "Rohini Sector 17"],
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
  /** Official social profiles. */
  social: {
    linkedin: "https://www.linkedin.com/company/newvisa-global-odyssey/",
    instagram: "https://www.instagram.com/newvisa.llp/",
  },
};

/** Single-line postal address, e.g. for the footer. */
export const siteAddress = [...site.contact.address.lines, `${site.contact.address.city} ${site.contact.address.postalCode}`].join(", ");

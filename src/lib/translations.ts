export const translations = {
  en: {
    // Nav
    'nav.exploreArt': 'Explore Art',
    'nav.discoverArtists': 'Discover Artists',
    'nav.howItWorks': 'How It Works',
    'nav.signIn': 'Sign In',
    'nav.getStarted': 'Get Started',
    'nav.dashboard': 'Dashboard',
    'nav.messages': 'Messages',
    'nav.myProposals': 'My Proposals',
    'nav.subscription': 'Subscription',
    'nav.profile': 'Profile',
    'nav.signOut': 'Sign Out',

    // Hero
    'hero.badge': '✨ The Art Marketplace',
    'hero.headline': 'Discover and Collect Extraordinary Art from Independent Artists',
    'hero.subtitle': 'Built for art lovers and artists seeking seamless connections, trusted partnerships, and creative inspiration.',
    'hero.searchPlaceholder': 'Search by medium, style, or artist…',
    'hero.exploreArt': 'Explore Art',
    'hero.discoverArtists': 'Discover Artists',

    // Footer
    'footer.platform': 'Platform',
    'footer.findArt': 'Find Art',
    'footer.browseArtists': 'Browse Artists',
    'footer.howItWorks': 'How It Works',
    'footer.forArtists': 'For Artists',
    'footer.gettingStarted': 'Getting Started',
    'footer.forCollectors': 'For Collectors',
    'footer.listArtwork': 'List Artwork',
    'footer.support': 'Support',
    'footer.legal': 'Legal',
    'footer.aboutUs': 'About Us',
    'footer.terms': 'Terms of Service',
    'footer.privacy': 'Privacy Policy',
    'footer.cookies': 'Cookie Policy',
    'footer.copyright': `© ${new Date().getFullYear()} Vivid Art. All rights reserved.`,
    'footer.tagline': 'Connecting artists with art lovers worldwide. Discover, collect, and celebrate creativity.',

    // Common
    'common.lightMode': 'Light Mode',
    'common.darkMode': 'Dark Mode',
    'common.english': 'English',
    'common.sinhala': 'සිංහල',
  },
  si: {
    // Nav
    'nav.exploreArt': 'කලා ගවේෂණය',
    'nav.discoverArtists': 'කලාකරුවන් සොයන්න',
    'nav.howItWorks': 'ක්‍රියාත්මක වන ආකාරය',
    'nav.signIn': 'පිවිසෙන්න',
    'nav.getStarted': 'ආරම්භ කරන්න',
    'nav.dashboard': 'උපකරණ පුවරුව',
    'nav.messages': 'පණිවිඩ',
    'nav.myProposals': 'මගේ යෝජනා',
    'nav.subscription': 'දායකත්වය',
    'nav.profile': 'පැතිකඩ',
    'nav.signOut': 'පිටවීම',

    // Hero
    'hero.badge': '✨ කලා වෙළඳපොළ',
    'hero.headline': 'ස්වාධීන කලාකරුවන්ගේ අසාමාන්‍ය කලා කෘති සොයා ගන්න',
    'hero.subtitle': 'කලා ලෝලීන් සහ කලාකරුවන් සඳහා නිර්මාණය කළ, විශ්වාසනීය හවුල්කාරිත්වයන් සහ නිර්මාණාත්මක ආභාසය.',
    'hero.searchPlaceholder': 'මාධ්‍ය, ශෛලිය, හෝ කලාකරු අනුව සොයන්න…',
    'hero.exploreArt': 'කලා ගවේෂණය',
    'hero.discoverArtists': 'කලාකරුවන් සොයන්න',

    // Footer
    'footer.platform': 'වේදිකාව',
    'footer.findArt': 'කලාව සොයන්න',
    'footer.browseArtists': 'කලාකරුවන් බලන්න',
    'footer.howItWorks': 'ක්‍රියාත්මක වන ආකාරය',
    'footer.forArtists': 'කලාකරුවන් සඳහා',
    'footer.gettingStarted': 'ආරම්භ කිරීම',
    'footer.forCollectors': 'එකතුකරුවන් සඳහා',
    'footer.listArtwork': 'කලා කෘතිය ලැයිස්තු කරන්න',
    'footer.support': 'සහාය',
    'footer.legal': 'නීතිමය',
    'footer.aboutUs': 'අප ගැන',
    'footer.terms': 'සේවා නියමයන්',
    'footer.privacy': 'රහස්‍යතා ප්‍රතිපත්තිය',
    'footer.cookies': 'කුකී ප්‍රතිපත්තිය',
    'footer.copyright': `© ${new Date().getFullYear()} Vivid Art. සියලු හිමිකම් ඇවිරිණි.`,
    'footer.tagline': 'ලොව පුරා කලාකරුවන් සහ කලා ලෝලීන් සම්බන්ධ කරමින්. සොයන්න, එකතු කරන්න, නිර්මාණශීලීත්වය සැමරන්න.',

    // Common
    'common.lightMode': 'ආලෝක ප්‍රකාරය',
    'common.darkMode': 'අඳුරු ප්‍රකාරය',
    'common.english': 'English',
    'common.sinhala': 'සිංහල',
  },
} as const;

export type Language = 'en' | 'si';
export type TranslationKey = keyof typeof translations.en;

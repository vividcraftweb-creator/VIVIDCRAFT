import ChatsPageClient from './ChatsPageClient';

export default function AdminChatsPage() {
  try {
    return <ChatsPageClient />;
  } catch (error) {
    console.error('Error rendering ChatsPageClient:', error);
    return (
      <div className="p-6 text-white space-y-4">
        <h1 className="text-2xl font-bold">Chat Management</h1>
        <p className="text-slate-400">Loading chat controls...</p>
      </div>
    );
  }
}

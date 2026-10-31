import Sidebar from "@/components/Sidebar";
import ChatArea from "@/components/ChatArea";

export default function Home() {
  return (
    <main className="flex h-screen bg-gray-50 dark:bg-[#000000] text-gray-900 dark:text-gray-100 overflow-hidden">
      <Sidebar />
      <ChatArea />
    </main>
  );
}

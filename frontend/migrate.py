import os, glob, re

replacements = {
    'bg-[#131314]': 'bg-white dark:bg-[#131314]',
    'bg-[#1e1f20]': 'bg-gray-50 dark:bg-[#1e1f20]',
    'bg-[#1a1b23]': 'bg-white dark:bg-[#1a1b23]',
    'bg-black/40': 'bg-gray-100 dark:bg-black/40',
    'bg-black/60': 'bg-black/40 dark:bg-black/60',
    'bg-[#282a2c]': 'bg-white dark:bg-[#282a2c]',
    'bg-white/5': 'bg-gray-200 dark:bg-white/5',
    'hover:bg-white/5': 'hover:bg-gray-200 dark:hover:bg-white/5',
    'bg-white/10': 'bg-gray-300 dark:bg-white/10',
    'hover:bg-white/10': 'hover:bg-gray-300 dark:hover:bg-white/10',
    'border-white/10': 'border-gray-200 dark:border-white/10',
    'border-white/20': 'border-gray-300 dark:border-white/20',
    'text-white': 'text-gray-900 dark:text-white',
    'text-gray-100': 'text-gray-900 dark:text-gray-100',
    'text-gray-200': 'text-gray-800 dark:text-gray-200',
    'text-gray-300': 'text-gray-700 dark:text-gray-300',
    'text-gray-400': 'text-gray-600 dark:text-gray-400',
    'text-gray-500': 'text-gray-500 dark:text-gray-500',
    'bg-[#000000]': 'bg-gray-50 dark:bg-[#000000]',
    'bg-[#121212]': 'bg-gray-100 dark:bg-[#121212]',
    'text-blue-400': 'text-blue-600 dark:text-blue-400',
    'text-purple-400': 'text-purple-600 dark:text-purple-400',
    'text-green-400': 'text-green-600 dark:text-green-400',
    'text-red-400': 'text-red-600 dark:text-red-400',
    'bg-blue-500/20': 'bg-blue-100 dark:bg-blue-500/20',
    'border-black': 'border-white dark:border-black'
}

def replace_classes(content):
    for old, new in replacements.items():
        pattern = r'(?<!dark:)(?<=[\s\"\'\`])' + re.escape(old) + r'(?=[\s\"\'\`])'
        content = re.sub(pattern, new, content)
    return content

files = glob.glob('c:/Users/saksh/Desktop/MODELS/AI-PDF-CHATBOT/frontend/components/**/*.tsx', recursive=True)

for filepath in files:
    if 'SettingsModal.tsx' in filepath:
        continue # We already did SettingsModal manually
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = replace_classes(content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated {filepath}')

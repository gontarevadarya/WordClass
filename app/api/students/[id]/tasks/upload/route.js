import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import mammoth from 'mammoth';
import { getJSON, setJSON } from '@/lib/store';
import { isTeacherRequest } from '@/lib/auth';
import { withErrorHandling } from '@/lib/api';

export const POST = withErrorHandling(async (req, { params }) => {
  if (!isTeacherRequest()) {
    return NextResponse.json({ error: 'Только учитель может загружать задания.' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  const customName = (formData.get('name') || '').toString().trim();

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Файл не выбран.' }, { status: 400 });
  }

  const filename = file.name || 'Задание';
  const lower = filename.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  let content = '';
  if (lower.endsWith('.docx')) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      content = result.value || '';
    } catch (e) {
      return NextResponse.json(
        { error: 'Не удалось прочитать файл .docx. Убедитесь, что это настоящий Word-документ (не .doc старого формата).' },
        { status: 400 }
      );
    }
  } else if (lower.endsWith('.txt')) {
    content = buffer.toString('utf-8');
  } else {
    return NextResponse.json(
      { error: 'Поддерживаются только файлы .docx и .txt.' },
      { status: 400 }
    );
  }

  const folders = await getJSON('tasks:' + params.id, []);
  const folder = {
    id: nanoid(10),
    name: customName || filename.replace(/\.(docx|txt)$/i, ''),
    content,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fromTeacher: true,
  };
  folders.push(folder);
  await setJSON('tasks:' + params.id, folders);
  return NextResponse.json({ folder });
});

"""Bounded JSON memory process. The launcher owns the data root; requests cannot change it."""
import json
import sys
from pathlib import Path
from memory import Brain, build_context, uid
from core import identity

def handle(root, request):
    if not isinstance(request, dict) or set(request) - {'operation','project','title','text','entity','status','revision'}:
        raise ValueError('Invalid request fields')
    project = request.get('project')
    if not uid(project):
        raise ValueError('Invalid project ID')
    operation = request.get('operation')
    if operation not in ('save','list','context','update','delete'):
        raise ValueError('Unsupported operation')
    text = request.get('text','')
    title = request.get('title','Project memory')
    if not isinstance(text,str) or len(text)>8000 or not isinstance(title,str) or not title.strip() or len(title)>120:
        raise ValueError('Invalid memory text')
    folder = root / project
    if folder.is_symlink():
        raise ValueError('Linked project folder refused')
    folder.mkdir(parents=True,exist_ok=True)
    if folder.resolve().parent != root.resolve():
        raise ValueError('Project folder outside data root')
    device_file = root / 'device-id.txt'
    if not device_file.exists():
        try:
            with device_file.open('x',encoding='utf-8') as f:
                f.write(identity())
        except FileExistsError:
            pass
    device = device_file.read_text(encoding='utf-8').strip()
    if not uid(device):
        raise ValueError('Invalid local device identity')
    db = folder / 'memory.sqlite3'
    if db.is_symlink():
        raise ValueError('Linked database refused')
    brain = Brain(db,device)
    if operation in ('update','delete'):
        entity=request.get('entity')
        if not uid(entity):
            raise ValueError('Invalid memory ID')
        heads=brain.heads(entity)
        if len(heads)!=1 or heads[0]['space']!='personal' or heads[0]['kind']!='memory' or heads[0]['deleted']:
            raise ValueError('Memory unavailable or conflicted')
        if request.get('revision')!=heads[0]['id']:
            raise ValueError('Memory changed; reload before editing')
        if operation=='delete':
            brain.delete(entity)
            return {'deleted':entity}
        status=request.get('status','confirmed')
        if status not in ('confirmed','outdated') or not text.strip():
            raise ValueError('Invalid memory update')
        return brain.save('memory','personal',{'title':title,'body':text,'source':'User edited project memory','status':status,'pinned':False},entity=entity)
    if operation=='save':
        if not text.strip():
            raise ValueError('Memory must not be empty')
        return brain.save('memory','personal',{'title':title,'body':text,'source':'User explicitly saved project memory','status':'confirmed','pinned':False})
    if operation=='list':
        return brain.entities('personal','memory')
    return build_context(brain,'personal',None,text)

def main():
    try:
        if len(sys.argv)!=2 or not Path(sys.argv[1]).is_absolute():
            raise ValueError('Launcher must supply an absolute data root')
        root=Path(sys.argv[1]);root.mkdir(parents=True,exist_ok=True)
        raw=sys.stdin.buffer.read(100001)
        if len(raw)>100000:
            raise ValueError('Request too large')
        value=handle(root,json.loads(raw))
        print(json.dumps({'ok':True,'value':value},ensure_ascii=True))
    except Exception as error:
        print(json.dumps({'ok':False,'error':str(error)},ensure_ascii=True))

if __name__=='__main__':
    main()

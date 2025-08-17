import * as fs from 'fs';
import * as path from 'path';

// حدد المرشحين لمسار الملفات
const candidateModules = path.join(__dirname, 'modules');
const candidateSrc = path.join(__dirname, 'src');
let BASE_DIR: string;

if (fs.existsSync(candidateModules)) {
  BASE_DIR = candidateModules;
} else if (fs.existsSync(candidateSrc)) {
  BASE_DIR = candidateSrc;
} else {
  console.error(
    'Error: لم يتم العثور على مجلّد modules/ أو src/ في جذر المشروع.',
  );
  process.exit(1);
}

// تحويل النص إلى PascalCase
function pascalCase(str: string): string {
  return str
    .replace(/(^\w|[._-]\w)/g, (txt) =>
      txt.replace(/[^a-zA-Z0-9]/g, '').toUpperCase(),
    )
    .replace(/[._-]/g, '');
}

function generateSpecContent(relPath: string): string {
  const filename = path.basename(relPath);
  const name = filename.replace(/\.ts$/, '');
  const className = pascalCase(name);
  const importPath = `./${name}`;
  let content = '';

  if (name.endsWith('controller')) {
    const serviceName = className.replace(/Controller$/, 'Service');
    const serviceFile =
      serviceName.charAt(0).toLowerCase() + serviceName.slice(1) + '.service';
    const serviceDir = path.dirname(relPath);
    content = `import { Test, TestingModule } from '@nestjs/testing';
import { ${className} } from '${importPath}';
import { ${serviceName} } from '../${serviceDir}/${serviceFile}';

describe('${className}', () => {
  let controller: ${className};
  const mock${serviceName} = {
    // ضع هنا Mock للطرق
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [${className}],
      providers: [
        { provide: ${serviceName}, useValue: mock${serviceName} },
      ],
    }).compile();

    controller = module.get<${className}>(${className});
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
`;
  } else if (name.endsWith('service')) {
    content = `import { Test, TestingModule } from '@nestjs/testing';
import { ${className} } from '${importPath}';

describe('${className}', () => {
  let service: ${className};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [${className}],
    }).compile();

    service = module.get<${className}>(${className});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
`;
  } else if (name.endsWith('module')) {
    content = `import { Test, TestingModule } from '@nestjs/testing';
import { ${className} } from '${importPath}';

describe('${className}', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [${className}],
    }).compile();
  });

  it('should be defined', () => {
    expect(moduleRef).toBeDefined();
  });
});
`;
  } else {
    content = `import { ${className} } from '${importPath}';

describe('${className}', () => {
  it('should be defined', () => {
    expect(${className}).toBeDefined();
  });
});
`;
  }
  return content;
}

// وظيفة للتنقل في المجلد وإنشاء الملفات
function walkDir(dir: string, callback: (file: string) => void) {
  fs.readdirSync(dir).forEach((name) => {
    const fullPath = path.join(dir, name);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, callback);
    } else if (name.endsWith('.ts') && !name.endsWith('.spec.ts')) {
      callback(fullPath);
    }
  });
}

console.log(`Generating specs in: ${BASE_DIR}`);
walkDir(BASE_DIR, (filePath) => {
  const specPath = filePath.replace(/\.ts$/, '.spec.ts');
  if (!fs.existsSync(specPath)) {
    const rel = path.relative(BASE_DIR, filePath);
    const content = generateSpecContent(rel);
    fs.writeFileSync(specPath, content, 'utf8');
    console.log(`Created ${specPath}`);
  }
});

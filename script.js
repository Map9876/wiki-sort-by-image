// 常量定义
const CURRENT_UTC = '2025-02-12 20:25:43';
const CURRENT_USER = 'map987654';

// API 参数获取函数 - 供开发者使用
async function getApiParameters(wikiUrl) {
    try {
        const apiUrl = normalizeWikiUrl(wikiUrl);
        const response = await fetch(`${apiUrl}?action=paraminfo&format=json&modules=query+allimages&origin=*`);
        const data = await response.json();
        
        // 获取 allimages 模块的参数信息
        const parameters = data.paraminfo.modules[0].parameters;
        return parameters;
    } catch (error) {
        console.error('Error fetching API parameters:', error);
        return null;
    }
}

// 开发者工具函数 - 用于动态创建表单元素
function createFormElement(parameter) {
    const div = document.createElement('div');
    div.className = 'form-group';
    
    const label = document.createElement('label');
    label.textContent = parameter.name;
    div.appendChild(label);
    
    let input;
    switch (parameter.type) {
        case 'timestamp':
            input = document.createElement('input');
            input.type = 'datetime-local';
            break;
        case 'string':
            if (parameter.allowedvalues) {
                input = document.createElement('select');
                parameter.allowedvalues.forEach(value => {
                    const option = document.createElement('option');
                    option.value = value;
                    option.textContent = value;
                    input.appendChild(option);
                });
            } else {
                input = document.createElement('input');
                input.type = 'text';
            }
            break;
        case 'integer':
            input = document.createElement('input');
            input.type = 'number';
            if (parameter.min !== undefined) input.min = parameter.min;
            if (parameter.max !== undefined) input.max = parameter.max;
            break;
        default:
            input = document.createElement('input');
            input.type = 'text';
    }
    
    input.name = parameter.name;
    input.id = parameter.name;
    input.className = 'form-control';
    
    if (parameter.required) {
        input.required = true;
    }
    
    div.appendChild(input);
    
    if (parameter.description) {
        const small = document.createElement('small');
        small.className = 'help-text';
        small.textContent = parameter.description;
        div.appendChild(small);
    }
    
    return div;
}

// 工具函数
function normalizeWikiUrl(url) {
    return url.replace(/\/*$/, '') + '/api.php';
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 你原有的 updateApiUrl 函数
function updateApiUrl(formData) {
    const params = new URLSearchParams();
    
    // 基础参数
    params.append('action', 'query');
    params.append('format', 'json');
    params.append('list', 'allimages');
    params.append('formatversion', '2');
    
    // 处理日期时间参数
    const aistart = formData.get('aistart');
    if (aistart && formData.get('aisort') === 'timestamp') {
        const date = new Date(aistart);
        const utcString = date.toISOString();
        params.append('aistart', utcString);
    }

    // 添加其他参数
    for (let [key, value] of formData.entries()) {
        if (value && key !== 'aistart' && key !== 'wikiUrl') {
            params.append(key, value);
        }
    }
    
    params.append('aiprop', 'timestamp|url|size|dimensions|mime|user');

    const wikiUrl = normalizeWikiUrl(formData.get('wikiUrl'));
    const apiUrl = `${wikiUrl}?${params.toString()}&origin=*`;
    
    // 更新URL显示
    const apiUrlLink = document.getElementById('apiUrlLink');
    apiUrlLink.href = apiUrl;
    apiUrlLink.textContent = apiUrl;
    
    return apiUrl;
}

function displayResults(images) {
    const tbody = document.getElementById('resultsBody');
    tbody.innerHTML = '';

    images.forEach(image => {
        const row = document.createElement('tr');
        const timestamp = formatDateTime(image.timestamp);
        const size = formatFileSize(image.size);

        row.innerHTML = `
            <td><img src="${image.url}" alt="${image.name}" class="thumbnail"></td>
            <td>${image.name}</td>
            <td>${timestamp}</td>
            <td>${image.user}</td>
            <td>${size}</td>
            <td>${image.width} × ${image.height}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// 开发者工具函数 - 导出API参数信息
async function exportApiParametersInfo(wikiUrl) {
    const parameters = await getApiParameters(wikiUrl);
    if (parameters) {
        const parametersInfo = {
            timestamp: new Date().toISOString(),
            wikiUrl,
            parameters: parameters
        };
        
        // 创建并下载JSON文件
        const blob = new Blob([JSON.stringify(parametersInfo, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'wiki-api-parameters.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// 事件监听器
document.addEventListener('DOMContentLoaded', function() {
    // 设置当前UTC时间和用户
    document.getElementById('currentUTC').textContent = CURRENT_UTC;
    document.getElementById('currentUser').textContent = CURRENT_USER;

    // 设置默认的起始时间
    const defaultDateTime = CURRENT_UTC.replace(' ', 'T');
    document.getElementById('aistart').value = defaultDateTime;

    // 触发初始URL更新
    const formData = new FormData(document.getElementById('searchForm'));
    updateApiUrl(formData);

    // 为开发者添加API参数获取功能
    if (window.location.search.includes('dev=true')) {
        const devButton = document.createElement('button');
        devButton.textContent = '导出API参数信息';
        devButton.id = 'exportApiParams';
        devButton.style.marginTop = '10px';
        document.querySelector('.container').appendChild(devButton);

        devButton.addEventListener('click', () => {
            const wikiUrl = document.getElementById('wikiUrl').value;
            exportApiParametersInfo(wikiUrl);
        });
    }
});

// 你原有的其他事件监听器代码
document.getElementById('searchForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const apiUrl = updateApiUrl(formData);

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            displayResults(data.query.allimages);
        })
        .catch(error => {
            console.error('Error:', error);
            alert('获取数据时发生错误，请检查控制台');
        });
});

document.getElementById('copyUrlBtn').addEventListener('click', function() {
    const apiUrl = document.getElementById('apiUrlLink').href;
    navigator.clipboard.writeText(apiUrl).then(() => {
        this.textContent = '✅';
        setTimeout(() => {
            this.textContent = '📋';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy URL:', err);
        alert('复制URL失败');
    });
});

document.getElementById('aisort').addEventListener('change', function(e) {
    const isTimestamp = e.target.value === 'timestamp';
    const aiuser = document.getElementById('aiuser');
    const aistart = document.getElementById('aistart');
    const timestampDependentElements = document.querySelectorAll('.timestamp-dependent');
    
    timestampDependentElements.forEach(element => {
        element.classList.toggle('active', isTimestamp);
    });

    aiuser.disabled = !isTimestamp;
    aistart.disabled = !isTimestamp;
});

// 实时更新API URL显示
document.querySelectorAll('#searchForm input, #searchForm select').forEach(element => {
    element.addEventListener('input', function() {
        const formData = new FormData(document.getElementById('searchForm'));
        updateApiUrl(formData);
    });
});

// 在原有代码基础上添加以下内容

let sortDirection = 'desc'; // 默认降序排列
let lastResults = []; // 存储最后一次查询的结果

// 将大小字符串转换为字节数
function convertSizeToBytes(sizeStr) {
    const units = {
        'Bytes': 1,
        'KB': 1024,
        'MB': 1024 * 1024,
        'GB': 1024 * 1024 * 1024
    };
    
    const [value, unit] = sizeStr.trim().split(' ');
    return parseFloat(value) * units[unit];
}

// 排序功能
function sortBySize() {
    const tbody = document.getElementById('resultsBody');
    const header = document.getElementById('sizeHeader');
    
    // 切换排序方向
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    
    // 更新表头样式
    header.classList.toggle('asc', sortDirection === 'asc');
    header.classList.add('sort-active');
    
    // 获取所有行并转换为数组
    const rows = Array.from(tbody.getElementsByTagName('tr'));
    
    // 添加排序动画
    tbody.classList.add('sorting-animation');
    
    // 排序
    rows.sort((a, b) => {
        const sizeA = convertSizeToBytes(a.cells[4].textContent);
        const sizeB = convertSizeToBytes(b.cells[4].textContent);
        return sortDirection === 'asc' ? sizeA - sizeB : sizeB - sizeA;
    });
    
    // 重新插入排序后的行
    rows.forEach(row => tbody.appendChild(row));
    
    // 移除排序动画
    setTimeout(() => {
        tbody.classList.remove('sorting-animation');
    }, 300);
}

// 修改原有的 displayResults 函数，添加排序相关的类和事件监听
function displayResults(images) {
    const tbody = document.getElementById('resultsBody');
    tbody.innerHTML = '';
    lastResults = images; // 保存结果用于排序

    images.forEach(image => {
        const row = document.createElement('tr');
        const timestamp = formatDateTime(image.timestamp);
        const size = formatFileSize(image.size);

        row.innerHTML = `
            <td><img src="${image.url}" alt="${image.name}" class="thumbnail"></td>
            <td>${image.name}</td>
            <td>${timestamp}</td>
            <td>${image.user}</td>
            <td class="size-cell">${size}</td>
            <td>${image.width} × ${image.height}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// 添加事件监听器
document.addEventListener('DOMContentLoaded', function() {
    // 保持原有的事件监听器...

    // 添加排序点击事件
    document.getElementById('sizeHeader').addEventListener('click', sortBySize);
});

// 在原有的提交事件处理中，获取数据后直接调用 displayResults
document.getElementById('searchForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const apiUrl = updateApiUrl(formData);

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            displayResults(data.query.allimages);
            // 重置排序方向
            sortDirection = 'desc';
            document.getElementById('sizeHeader').classList.remove('asc', 'sort-active');
        })
        .catch(error => {
            console.error('Error:', error);
            alert('获取数据时发生错误，请检查控制台');
        });
});

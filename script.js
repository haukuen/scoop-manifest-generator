document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('manifest-form');
    const jsonPreview = document.getElementById('json-preview');
    const copyButton = document.getElementById('copy-button');

    /**
     * 解析多行文本为数组，过滤空行
     * @param {string} value - 输入的多行文本
     * @returns {Array} 解析后的数组
     */
    const parseMultilineToArray = (value) => {
        if (!value.trim()) return null;
        return value.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
    };

    /**
     * 解析环境变量设置
     * @param {string} value - 环境变量设置文本
     * @returns {Object|null} 环境变量对象
     */
    const parseEnvSet = (value) => {
        if (!value.trim()) return null;
        const envObj = {};
        value.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed) {
                const [key, ...valueParts] = trimmed.split('=');
                if (key && valueParts.length > 0) {
                    envObj[key.trim()] = valueParts.join('=').trim();
                }
            }
        });
        return Object.keys(envObj).length > 0 ? envObj : null;
    };

    /**
     * 解析建议安装包
     * @param {string} value - 建议安装文本
     * @returns {Object|null} 建议安装对象
     */
    const parseSuggest = (value) => {
        if (!value.trim()) return null;
        const suggestObj = {};
        value.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed) {
                const colonIndex = trimmed.indexOf(':');
                if (colonIndex > 0) {
                    const key = trimmed.substring(0, colonIndex).trim();
                    const val = trimmed.substring(colonIndex + 1).trim();
                    if (key && val) {
                        suggestObj[key] = val;
                    }
                }
            }
        });
        return Object.keys(suggestObj).length > 0 ? suggestObj : null;
    };

    /**
     * 解析bin字段，支持简单字符串和复杂数组格式
     * @param {string} value - bin字段文本
     * @returns {Array|string|null} 解析后的bin值
     */
    const parseBin = (value) => {
        if (!value.trim()) return null;
        const lines = parseMultilineToArray(value);
        if (!lines) return null;
        
        if (lines.length === 1) {
            const line = lines[0];
            if (line.includes(',')) {
                // 包含逗号，解析为数组格式
                const parts = line.split(',').map(p => p.trim());
                return parts.length > 1 ? parts : line;
            }
            return line;
        }
        
        // 多行，每行可能是简单字符串或数组格式
        return lines.map(line => {
            if (line.includes(',')) {
                const parts = line.split(',').map(p => p.trim());
                return parts.length > 1 ? parts : line;
            }
            return line;
        });
    };

    /**
     * 解析shortcuts字段
     * @param {string} value - shortcuts字段文本
     * @returns {Array|null} 解析后的shortcuts数组
     */
    const parseShortcuts = (value) => {
        if (!value.trim()) return null;
        const lines = parseMultilineToArray(value);
        if (!lines) return null;
        
        return lines.map(line => {
            // 尝试解析JSON数组格式
            if (line.startsWith('[') && line.endsWith(']')) {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    // 解析失败，按逗号分割
                }
            }
            // 按逗号分割
            return line.split(',').map(p => p.trim()).filter(p => p);
        });
    };

    /**
     * 更新JSON预览
     */
    const updateJson = () => {
        const manifest = {};

        // 必填字段
        const version = document.getElementById('version').value.trim();
        const description = document.getElementById('description').value.trim();
        const homepage = document.getElementById('homepage').value.trim();
        const license = document.getElementById('license').value.trim();
        const url = document.getElementById('url').value.trim();
        const hash = document.getElementById('hash').value.trim();

        if (version) manifest.version = version;
        if (description) manifest.description = description;
        if (homepage) manifest.homepage = homepage;
        
        // 处理许可证字段
         const licenseAdvanced = document.getElementById('license_advanced').checked;
         if (licenseAdvanced) {
             const licenseIdentifier = document.getElementById('license_identifier').value.trim();
             const licenseUrl = document.getElementById('license_url').value.trim();
             
             if (licenseIdentifier || licenseUrl) {
                 const licenseObj = {};
                 if (licenseIdentifier) licenseObj.identifier = licenseIdentifier;
                 if (licenseUrl) licenseObj.url = licenseUrl;
                 manifest.license = licenseObj;
             } else if (license) {
                 manifest.license = license;
             }
         } else if (license) {
             manifest.license = license;
         }
        // 架构支持
        const enableArchitecture = document.getElementById('enable_architecture').checked;
        if (!enableArchitecture) {
            // 只有在非多架构模式下才添加外层的url和hash
            if (url) manifest.url = url;
            if (hash) manifest.hash = hash;
        }

        // 单架构安装配置（只在非多架构模式下处理）
        if (!enableArchitecture) {
            const extractDir = document.getElementById('extract_dir').value.trim();
            if (extractDir) manifest.extract_dir = extractDir;

            const bin = parseBin(document.getElementById('bin').value);
            if (bin) manifest.bin = bin;
        }
        
        // 快捷方式和持久化（只在启用时处理）
        const enableShortcutsPersist = document.getElementById('enable_shortcuts_persist').checked;
        if (enableShortcutsPersist) {
            const shortcuts = parseShortcuts(document.getElementById('shortcuts').value);
            if (shortcuts) manifest.shortcuts = shortcuts;

            const persist = parseMultilineToArray(document.getElementById('persist').value);
            if (persist) manifest.persist = persist;
        }
        
        // 依赖管理（只在启用时处理）
        const enableDependencies = document.getElementById('enable_dependencies').checked;
        if (enableDependencies) {
            const depends = parseMultilineToArray(document.getElementById('depends').value);
            if (depends) manifest.depends = depends;

            const suggest = parseSuggest(document.getElementById('suggest').value);
            if (suggest) manifest.suggest = suggest;
        }

        // 环境变量（只在启用时处理）
        const enableEnvironment = document.getElementById('enable_environment').checked;
        if (enableEnvironment) {
            const envAddPath = parseMultilineToArray(document.getElementById('env_add_path').value);
            if (envAddPath) manifest.env_add_path = envAddPath;

            const envSet = parseEnvSet(document.getElementById('env_set').value);
            if (envSet) manifest.env_set = envSet;
        }

        // 安装器设置（只在启用时处理）
        const enableInstaller = document.getElementById('enable_installer').checked;
        if (enableInstaller) {
            const innosetup = document.getElementById('innosetup').checked;
            if (innosetup) manifest.innosetup = true;

            const installerScript = parseMultilineToArray(document.getElementById('installer_script').value);
            if (installerScript) {
                manifest.installer = {
                    script: installerScript.length === 1 ? installerScript[0] : installerScript
                };
            }

            const preInstall = parseMultilineToArray(document.getElementById('pre_install').value);
            if (preInstall) manifest.pre_install = preInstall.length === 1 ? preInstall[0] : preInstall;

            const postInstall = parseMultilineToArray(document.getElementById('post_install').value);
            if (postInstall) manifest.post_install = postInstall.length === 1 ? postInstall[0] : postInstall;
        }

        // checkver处理（独立于其他设置）
        const checkverSimpleMode = document.getElementById('checkver_simple_mode').checked;
        if (checkverSimpleMode) {
            // 简单模式：直接使用"github"
            manifest.checkver = "github";
        } else {
            // 高级模式：构建对象
            const checkverUrl = document.getElementById('checkver_url').value.trim();
            const checkverRegex = document.getElementById('checkver_regex').value.trim();
            if (checkverUrl && checkverRegex) {
                manifest.checkver = {
                    url: checkverUrl,
                    regex: checkverRegex
                };
            }
        }



        // autoupdate处理
        if (enableArchitecture) {
            // 多架构模式
            const autoupdate64bitUrl = document.getElementById('autoupdate_64bit_url').value.trim();
            const autoupdate32bitUrl = document.getElementById('autoupdate_32bit_url').value.trim();
            const autoupdateArm64Url = document.getElementById('autoupdate_arm64_url').value.trim();
            
            if (autoupdate64bitUrl || autoupdate32bitUrl || autoupdateArm64Url) {
                const autoupdateObj = {
                    architecture: {}
                };
                
                if (autoupdate64bitUrl) {
                    autoupdateObj.architecture['64bit'] = {
                        url: autoupdate64bitUrl
                    };
                }
                
                if (autoupdate32bitUrl) {
                    autoupdateObj.architecture['32bit'] = {
                        url: autoupdate32bitUrl
                    };
                }
                
                if (autoupdateArm64Url) {
                    autoupdateObj.architecture['arm64'] = {
                        url: autoupdateArm64Url
                    };
                }
                
                manifest.autoupdate = autoupdateObj;
            }
        } else {
            // 单架构模式
            const autoupdateUrl = document.getElementById('autoupdate_url').value.trim();
            
            if (autoupdateUrl) {
                manifest.autoupdate = {
                    url: autoupdateUrl
                };
            }
        }

        // 其他设置（只在启用时处理）
        const enableMisc = document.getElementById('enable_misc').checked;
        if (enableMisc) {
            const notes = parseMultilineToArray(document.getElementById('notes').value);
            if (notes) manifest.notes = notes.length === 1 ? notes[0] : notes;
        }

        if (enableArchitecture) {
            const architecture = {};
            
            // 64位架构
            const arch64Url = document.getElementById('arch_64_url').value.trim();
            const arch64Hash = document.getElementById('arch_64_hash').value.trim();
            const arch64ExtractDir = document.getElementById('arch_64_extract_dir').value.trim();
            const arch64Bin = parseBin(document.getElementById('arch_64_bin').value);
            
            if (arch64Url || arch64Hash || arch64ExtractDir || arch64Bin) {
                architecture['64bit'] = {};
                if (arch64Url) architecture['64bit'].url = arch64Url;
                if (arch64Hash) architecture['64bit'].hash = arch64Hash;
                if (arch64ExtractDir) architecture['64bit'].extract_dir = arch64ExtractDir;
                if (arch64Bin) architecture['64bit'].bin = arch64Bin;
            }
            
            // 32位架构
            const arch32Url = document.getElementById('arch_32_url').value.trim();
            const arch32Hash = document.getElementById('arch_32_hash').value.trim();
            const arch32ExtractDir = document.getElementById('arch_32_extract_dir').value.trim();
            const arch32Bin = parseBin(document.getElementById('arch_32_bin').value);
            
            if (arch32Url || arch32Hash || arch32ExtractDir || arch32Bin) {
                architecture['32bit'] = {};
                if (arch32Url) architecture['32bit'].url = arch32Url;
                if (arch32Hash) architecture['32bit'].hash = arch32Hash;
                if (arch32ExtractDir) architecture['32bit'].extract_dir = arch32ExtractDir;
                if (arch32Bin) architecture['32bit'].bin = arch32Bin;
            }
            
            // ARM64架构
            const archArm64Url = document.getElementById('arch_arm64_url').value.trim();
            const archArm64Hash = document.getElementById('arch_arm64_hash').value.trim();
            const archArm64ExtractDir = document.getElementById('arch_arm64_extract_dir').value.trim();
            const archArm64Bin = parseBin(document.getElementById('arch_arm64_bin').value);
            
            if (archArm64Url || archArm64Hash || archArm64ExtractDir || archArm64Bin) {
                architecture['arm64'] = {};
                if (archArm64Url) architecture['arm64'].url = archArm64Url;
                if (archArm64Hash) architecture['arm64'].hash = archArm64Hash;
                if (archArm64ExtractDir) architecture['arm64'].extract_dir = archArm64ExtractDir;
                if (archArm64Bin) architecture['arm64'].bin = archArm64Bin;
            }
            
            if (Object.keys(architecture).length > 0) {
                manifest.architecture = architecture;
            }
        }



        jsonPreview.textContent = JSON.stringify(manifest, null, 4);
    };

    /**
     * 切换高级许可证部分的显示/隐藏
     */
    const toggleLicenseSection = () => {
        const licenseAdvanced = document.getElementById('license_advanced');
        const licenseAdvancedSection = document.getElementById('license_advanced_section');
        
        licenseAdvanced.addEventListener('change', () => {
            if (licenseAdvanced.checked) {
                licenseAdvancedSection.style.display = 'block';
            } else {
                licenseAdvancedSection.style.display = 'none';
            }
            updateJson();
        });
    };

    /**
     * 切换checkver模式的显示/隐藏
     */
    const toggleCheckverSection = () => {
        const checkverSimpleMode = document.getElementById('checkver_simple_mode');
        const checkverAdvancedSection = document.getElementById('checkver_advanced_section');
        
        checkverSimpleMode.addEventListener('change', () => {
            if (checkverSimpleMode.checked) {
                checkverAdvancedSection.style.display = 'none';
            } else {
                checkverAdvancedSection.style.display = 'block';
            }
            updateJson();
        });
    };

    /**
     * 切换单架构和多架构模式的显示
     */
    const toggleArchitectureSections = () => {
        const enableArchitecture = document.getElementById('enable_architecture');
        
        enableArchitecture.addEventListener('change', () => {
            const singleArchSection = document.getElementById('single_arch_section');
            const singleArchInstallSection = document.getElementById('single_arch_install_section');
            const architectureSection = document.getElementById('architecture_section');
            const singleArchAutoupdateSection = document.getElementById('single_arch_autoupdate_section');
            const multiArchAutoupdateSection = document.getElementById('multi_arch_autoupdate_section');
            
            if (enableArchitecture.checked) {
                if (singleArchSection) singleArchSection.style.display = 'none';
                if (singleArchInstallSection) singleArchInstallSection.style.display = 'none';
                if (architectureSection) architectureSection.style.display = 'block';
                if (singleArchAutoupdateSection) singleArchAutoupdateSection.style.display = 'none';
                if (multiArchAutoupdateSection) multiArchAutoupdateSection.style.display = 'block';
            } else {
                if (singleArchSection) singleArchSection.style.display = 'block';
                if (singleArchInstallSection) singleArchInstallSection.style.display = 'block';
                if (architectureSection) architectureSection.style.display = 'none';
                if (singleArchAutoupdateSection) singleArchAutoupdateSection.style.display = 'block';
                if (multiArchAutoupdateSection) multiArchAutoupdateSection.style.display = 'none';
            }
            updateJson();
        });
    };

    /**
     * 切换可选功能区域的显示/隐藏
     */
    const toggleOptionalSections = () => {
        // 快捷方式和持久化
        const enableShortcutsPersist = document.getElementById('enable_shortcuts_persist');
        if (enableShortcutsPersist) {
            enableShortcutsPersist.addEventListener('change', () => {
                const shortcutsPersistSection = document.getElementById('shortcuts_persist_section');
                if (shortcutsPersistSection) {
                    shortcutsPersistSection.style.display = enableShortcutsPersist.checked ? 'block' : 'none';
                }
                updateJson();
            });
        }
        
        // 依赖管理
        const enableDependencies = document.getElementById('enable_dependencies');
        if (enableDependencies) {
            enableDependencies.addEventListener('change', () => {
                const dependenciesSection = document.getElementById('dependencies_section');
                if (dependenciesSection) {
                    dependenciesSection.style.display = enableDependencies.checked ? 'block' : 'none';
                }
                updateJson();
            });
        }
        
        // 环境变量
        const enableEnvironment = document.getElementById('enable_environment');
        if (enableEnvironment) {
            enableEnvironment.addEventListener('change', () => {
                const environmentSection = document.getElementById('environment_section');
                if (environmentSection) {
                    environmentSection.style.display = enableEnvironment.checked ? 'block' : 'none';
                }
                updateJson();
            });
        }
        
        // 安装器设置
        const enableInstaller = document.getElementById('enable_installer');
        if (enableInstaller) {
            enableInstaller.addEventListener('change', () => {
                const installerSection = document.getElementById('installer_section');
                if (installerSection) {
                    installerSection.style.display = enableInstaller.checked ? 'block' : 'none';
                }
                updateJson();
            });
        }
        
        // 其他设置
        const enableMisc = document.getElementById('enable_misc');
        if (enableMisc) {
            enableMisc.addEventListener('change', () => {
                const miscSection = document.getElementById('misc_section');
                if (miscSection) {
                    miscSection.style.display = enableMisc.checked ? 'block' : 'none';
                }
                updateJson();
            });
        }
        

    };

    form.addEventListener('input', updateJson);
    
    // 监听架构相关字段的变化
    document.getElementById('enable_architecture').addEventListener('change', updateJson);
    document.getElementById('license_advanced').addEventListener('change', updateJson);
    document.getElementById('checkver_simple_mode').addEventListener('change', updateJson);
    
    // 为所有切换功能添加事件监听器
     const toggleElements = ['enable_shortcuts_persist', 'enable_dependencies', 'enable_environment', 'enable_installer', 'enable_misc'];
     toggleElements.forEach(id => {
         const element = document.getElementById(id);
         if (element) {
             element.addEventListener('change', updateJson);
         }
     });
     
    // checkver高级模式字段
    document.getElementById('checkver_url').addEventListener('input', updateJson);
    document.getElementById('checkver_regex').addEventListener('input', updateJson);
    
    ['arch_64_url', 'arch_64_hash', 'arch_64_extract_dir', 'arch_64_bin',
      'arch_32_url', 'arch_32_hash', 'arch_32_extract_dir', 'arch_32_bin',
      'arch_arm64_url', 'arch_arm64_hash', 'arch_arm64_extract_dir', 'arch_arm64_bin',
      'autoupdate_url', 'autoupdate_64bit_url', 'autoupdate_32bit_url', 'autoupdate_arm64_url', 'license_identifier', 'license_url'].forEach(id => {
         const element = document.getElementById(id);
         if (element) {
             element.addEventListener('input', updateJson);
         }
     });

    copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(jsonPreview.textContent)
            .then(() => {
                copyButton.textContent = '已复制!';
                setTimeout(() => {
                    copyButton.textContent = '复制到剪贴板';
                }, 2000);
            })
            .catch(err => {
                console.error('无法复制文本: ', err);
            });
    });

    // 初始化
     toggleLicenseSection();
     toggleArchitectureSections();
     toggleOptionalSections();
     toggleCheckverSection();
     updateJson();
});
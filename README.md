# 项目名称：小红书爆款采集分析

## 项目简介
小红书爆款采集分析是一个用于采集和分析小红书平台上热门笔记的工具。用户可以设置采集的笔记数量和最小点赞数，方便获取高质量的内容进行分析。

## 功能特性
- **采集笔记数量**：用户可以自定义要采集的笔记数量，默认为10。
- **最小点赞数**：用户可以设置最小点赞数，只有点赞数超过该值的笔记才会被采集，默认为500。
- **开始/停止获取**：用户可以通过按钮控制采集的开始和停止。
- **导出功能**：采集到的数据可以导出为Excel文件和txt文件，方便后续分析。
- **AI分析功能**：采集完成后自动分析笔记内容，提供营销建议。**支持多种AI模型选择，包括最新的gemini-2.5模型。**
- **AI互动聊天**：用户可以与AI助手进行多轮对话，深入分析内容。**可在界面中自由切换AI模型（如deepseek、gemini-2.5等）以获得不同风格的分析结果。**
- **任意网页内容获取**：用户可以获取任何网页的内容，不仅限于小红书笔记。
- **一键总结功能**：对获取的网页内容进行AI智能总结，提炼核心观点。

## 使用说明
1. 输入您希望采集的笔记数量和最小点赞数。
2. 点击"开始获取"按钮开始采集数据。
3. 点击"停止获取"按钮可以中止采集。
4. 采集到的数据会自动导出两个文件：
   - Excel文件(.xlsx)：包含笔记的基础数据（标题、作者、点赞数、收藏数、评论数、链接、笔记内容）
   - TXT文件：包含笔记的详细内容和标题，每条笔记用分隔线分隔。
5. 采集完成后，AI会自动分析笔记内容，您可以在聊天界面查看分析结果。**支持选择不同AI模型（如gemini-2.5），体验多样化智能分析。**
6. 您还可以上传TXT文件（最大10MB）进行AI分析，或直接在聊天界面提问。
7. 点击AI助手分析对话右侧的文档图标，可以获取当前浏览网页的内容。
8. 获取网页内容后，可以使用以下功能：
   - 点击"一键总结"按钮，AI会自动总结网页内容的核心观点
   - 点击"写成笔记"按钮，AI会将内容改写成1000字以内的小红书风格笔记
   - 点击"生成爆款标题"按钮，AI会生成5个吸引人的小红书爆款标题
   - 点击页面标题可直接查看原文

## 技术栈
- HTML
- CSS
- JavaScript

## 贡献
欢迎任何形式的贡献！请提交您的问题或拉取请求。

## 许可证
本项目采用MIT许可证，详情请查看LICENSE文件。

## 更新记录

### 2025-07-11
- 新增自定义指令，让AI可以根据自定义指令回复内容

### 2025-06-25
- 新增AI助手支持gemini-2.5模型，可在模型选择器中切换体验更强大的智能分析能力
- 新增AI模型选择功能，用户可在聊天界面自由切换不同AI模型（如deepseek、gemini-2.5等）
- 集成Google Gemini-2.5模型，带来更强的理解和生成能力

### 2025-05-13
- 增加文生图功能

### 2025-04-24
- 优化发送/停止按钮：改为圆形设计，减小尺寸，提升界面美观度
- 改进按钮状态切换：优化发送/停止按钮的状态切换逻辑，提供更好的视觉反馈
- 新增会话管理功能：每次进入插件时自动创建新的聊天会话，保留历史记录
- 优化停止按钮功能：发送消息后立即显示停止按钮，允许用户随时中断AI响应
- 更新界面图标：使用自定义SVG图标替换默认图标，提升界面美观度和一致性

### 2025-04-22
- 新增"写成笔记"功能：将网页内容改写成1000字以内的小红书风格笔记
- 新增"生成爆款标题"功能：直接生成5个吸引人的小红书爆款标题
- 优化UI界面：删除"查看原文"按钮，点击标题即可查看原文
- 简化用户体验：获取页面内容后不再显示额外提示信息
- 修复了消息通信错误，提高了插件稳定性
- 版本更新至1.3

### 2025-04-21
- 添加获取任意网页内容功能，不再仅限于小红书笔记
- 添加一键总结功能，可以快速总结网页内容的核心观点
- 优化了页面内容获取的错误处理机制
- 改进了内容展示，提供更清晰的来源和作者信息

### 2025-03-22
- 优化数据导出功能：将CSV格式改为Excel(.xlsx)格式，支持设置行高和列宽
- 在导出的表格中增加笔记正文内容列，使数据更加完整
- 修复了笔记收藏数和评论数无法正确获取的问题
- 修复了导出功能的重复导出问题
- 优化了TXT文档中的笔记格式，添加了点赞、收藏、评论数量信息
- 在插件界面底部添加联系方式，方便用户反馈问题

### 2025-01-20
- 增加上传文件功能，支持txt文件，最大10MB，用户输入问题可以对文件进行AI分析
- 增加AI回答的复制功能

### 2025-01-18
- AI回答改成流式输出
- 增加AI回答的上下文，具备多轮对话
- 插件前端界面由弹窗改成侧边栏

### 2025-01-14
优化功能：
- 删除导出文件功能，采集完成后自动导出采集的csv和txt文件
- 增加AI分析功能，采集完成后自动分析采集的笔记
- 增加AI互动聊天的交流界面


## 联系方式
如有问题或建议，请加微信：jiangjiren

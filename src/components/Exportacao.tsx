import React from 'react';

const Exportacao: React.FC = () => {
  return (
    <main className="flex-1 flex overflow-hidden">
      {/* Main Content Area: The Canvas */}
      <section className="flex-1 bg-surface flex flex-col relative overflow-hidden">
        {/* Breadcrumbs / Active Step Info */}
        <div className="px-12 pt-8 pb-4 flex justify-between items-end">
          <div>
            <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-background mb-1">Final Review</h1>
            <p className="text-on-surface-variant font-body text-sm tracking-wide">Wedding 2024 / 42 Spreads / Premium Lustre Paper</p>
          </div>
          <div className="flex gap-4">
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-high rounded-sm text-on-surface-variant text-xs font-medium hover:bg-surface-bright transition-all">
              <span className="material-symbols-outlined text-sm">fullscreen</span>
              PRESENTATION MODE
            </button>
          </div>
        </div>

        {/* Central Carousel */}
        <div className="flex-1 flex items-center justify-center px-12 relative">
          <button className="absolute left-8 z-10 p-3 bg-surface-container/50 backdrop-blur-md rounded-full text-on-surface hover:bg-surface-container transition-all">
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <div className="w-full max-w-6xl aspect-[2/1] bg-surface-container-lowest rounded-sm overflow-hidden shadow-2xl ring-1 ring-outline-variant/10 group relative">
            <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDqLlh4YyB9NxgIMKAS-LaW5vR4UVabjEV78geHlZ7hJf_UcoYXwviTCeq8mBjCjXt8ldjCdI450M7ftofj6vEoyCJP9_hDg35XqYRvpsJAtcmvIDtdzUYUF6uwmWA7TaEE8JVs_uw8TjfX6q7K5t5tpEgKY7Ncvner_sXjG7NaWV3_0u5OVjTyBdX69TOwY5j6lgIs12ed7kKtpS2CKG_hWwH2YKNL9AfmvJjQqrxJpRu8mrzXVfBtsQjOWDgqaEUQDiysvbjgSeJ"/>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/5 text-[10px] font-bold tracking-widest uppercase">
              Spread 24 of 42
            </div>
          </div>
          <button className="absolute right-8 z-10 p-3 bg-surface-container/50 backdrop-blur-md rounded-full text-on-surface hover:bg-surface-container transition-all">
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        {/* Filmstrip / Thumbnail Tray */}
        <div className="h-32 bg-surface-container-low border-t border-outline-variant/10 px-12 flex items-center gap-4 overflow-x-auto hide-scrollbar">
          <div className="flex-none w-40 aspect-video rounded-sm overflow-hidden ring-2 ring-primary relative">
            <img className="w-full h-full object-cover opacity-100" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCeUCV1vk_rPaLpatjP3cYacn1RSK2MI5trKTJFrE64-JWkGSCWG3gYQGzxO7cnAuAPYYXCGZ2PvqrdJ9VItCpIwuV_Fol-dqQY3kvD88yDNjhkBP6SigpqpH09g6viluuNqaoDsE5FIwSdLO2ae2B9ga2OfYmcFnr0FbxxpuTXHO5HBdl70juDwVvIAKQwo0c97MO8hN_4KqTPxW2LpCI6AwkHko353vGyAnmahTwzbhnDrX2r00fd5Vy-N0Vf4TkQrBuCp6OEI12B"/>
            <div className="absolute inset-0 bg-primary/10"></div>
          </div>
          <div className="flex-none w-40 aspect-video rounded-sm overflow-hidden opacity-40 hover:opacity-80 transition-all cursor-pointer">
            <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkd7gdWn8AS-cqrn8Ot2gy4KgzdAkSpfCurn2h8KojAHV2lwBTFBp7Hw4GJ4x_sTyVVaPCnqcxKFdMmlCSDvbiNIjlXVa1_5ziOy6_LllSAcLpQnU6A3K-ZeULRS0kkv69K-nLnj6WaiXL6JiZj2_IMajF9rGWLiEvYWu_FDQ8F-STzbS64vga7pN7aePxiPp_I9AVgXScKeuHDpmOH1BWWw1CnASwUVLE-kVLLScqkxVDyfEQMWMPLkYmkYZhLtRqTMMoiyWoa0_h"/>
          </div>
          <div className="flex-none w-40 aspect-video rounded-sm overflow-hidden opacity-40 hover:opacity-80 transition-all cursor-pointer">
            <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDgBjtzg5f61-FwCunxOpIKeiReW50MIYUiTNKKTmTNidHZXXxD1sZgqVummynjwEa9gnpIku-btn9K9tNFQmRqoacjO3LnvQt6pwveIKRz4V_5ewmzoP63GVqpWlVLGkB16Ml4sCSwdVQhHFWscYAGbQESRE0oT1LC1N0GK9QTqJnASAF0En-LCr68uOOhnN8UDD1Cvg7Km6Xu9_WsWIfvP8RmGOg6wr6H4Ab3p4NJD3pKao8ZgApkKEl4nLBuHdmoD_vaEJhbc0B-"/>
          </div>
        </div>
      </section>

      {/* Inspector Panel: Export Options */}
      <aside className="w-96 bg-surface-container-high border-l border-outline-variant/10 flex flex-col overflow-y-auto">
        <div className="p-8">
          <h2 className="font-headline text-lg font-bold tracking-tight text-on-background mb-6">Export Settings</h2>
          
          {/* Format Selector */}
          <div className="space-y-4 mb-8">
            <label className="block text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">Export Format</label>
            <div className="grid grid-cols-1 gap-2">
              <button className="flex items-center justify-between p-4 bg-surface-bright rounded-sm border border-primary/40 group">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">cloud_upload</span>
                  <div className="text-left">
                    <p className="text-sm font-bold">Cloud Review</p>
                    <p className="text-[10px] text-on-surface-variant">Send to client for feedback</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </button>
              
              <button className="flex items-center justify-between p-4 bg-surface-container-highest/50 rounded-sm border border-transparent hover:border-outline-variant/30 transition-all group">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-on-surface transition-colors">picture_as_pdf</span>
                  <div className="text-left">
                    <p className="text-sm font-bold text-on-surface-variant group-hover:text-on-surface transition-colors">PDF for Print</p>
                    <p className="text-[10px] text-on-surface-variant">High-resolution print ready</p>
                  </div>
                </div>
              </button>
              
              <button className="flex items-center justify-between p-4 bg-surface-container-highest/50 rounded-sm border border-transparent hover:border-outline-variant/30 transition-all group">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-on-surface transition-colors">image</span>
                  <div className="text-left">
                    <p className="text-sm font-bold text-on-surface-variant group-hover:text-on-surface transition-colors">JPEG Spreads</p>
                    <p className="text-[10px] text-on-surface-variant">Individual spread images</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
          
          <div className="mt-12 space-y-4">
            <button className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary py-4 rounded-sm font-headline text-sm font-bold uppercase tracking-widest shadow-lg shadow-primary/10 hover:translate-y-[-1px] transition-all active:scale-95 duration-200">
              Generate & Upload
            </button>
            <p className="text-center text-[10px] text-on-surface-variant leading-relaxed">
              Estimated file size: 1.4 GB<br/>
              Ready for lab-direct ordering after upload.
            </p>
          </div>
        </div>
      </aside>
    </main>
  );
};

export default Exportacao;
